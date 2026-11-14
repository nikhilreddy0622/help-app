import bcrypt from 'bcryptjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma, sha256 } from '../src/lib/core';
import { V1, api, dbReady, loginPhone, rand } from './helpers';

let ready = false;
beforeAll(async () => {
  ready = await dbReady();
  if (!ready) console.warn('SKIPPED admin tests: database not reachable');
});
const t = (name: string, fn: () => Promise<void>) => it(name, async (ctx) => (ready ? fn() : ctx.skip()));

const PASSWORD = 'Initial-pass-1';
async function makeAdmin(role: 'SUPER_ADMIN' | 'SUPPORT' | 'FINANCE' = 'SUPER_ADMIN') {
  const email = `admin${rand(8)}@example.test`;
  const a = await prisma.adminUser.create({ data: { email, name: 'Test Admin', role, passwordHash: await bcrypt.hash(PASSWORD, 4) } });
  return { ...a, email };
}
const login = async (email: string, password = PASSWORD) => api().post(`${V1}/admin/auth/login`).send({ email, password });
const resetToken = async (adminId: string) => {
  const token = `tok_${rand(30)}`;
  await prisma.adminPasswordReset.create({ data: { adminId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  return token;
};

describe('admin auth', () => {
  t('logs in and enforces RBAC', async () => {
    const support = await makeAdmin('SUPPORT');
    const { body } = await login(support.email).then((r) => (expect(r.status).toBe(200), r));
    const auth = { Authorization: `Bearer ${body.data.accessToken}` };
    await api().get(`${V1}/admin/support/tickets`).set(auth).expect(200);
    await api().get(`${V1}/admin/payments`).set(auth).expect(403); // FINANCE only
    await api().get(`${V1}/admin/audit-logs`).set(auth).expect(403); // super admin only
    await login(support.email, 'wrong-password').then((r) => expect(r.status).toBe(401));
    // a user token is not an admin token
    const u = await loginPhone();
    await api().get(`${V1}/admin/overview`).set(u.auth).expect(401);
  });

  t('forgot always answers ok (no enumeration) and emails a reset link for real admins', async () => {
    const a = await makeAdmin();
    const ok1 = await api().post(`${V1}/admin/auth/forgot`).send({ email: a.email }).expect(200);
    const ok2 = await api().post(`${V1}/admin/auth/forgot`).send({ email: `nobody${rand(6)}@example.test` }).expect(200);
    expect(ok1.body.data).toEqual(ok2.body.data);
    expect(await prisma.adminPasswordReset.count({ where: { adminId: a.id } })).toBe(1);
    const mail = await prisma.emailLog.findFirst({ where: { to: a.email, template: 'admin-password-reset' } });
    expect(mail).toBeTruthy();
    expect(JSON.stringify(mail!.vars)).toContain('http://localhost:5174/reset-password?token=');
  });

  t('reset token is single use; old sessions and the old password stop working', async () => {
    const a = await makeAdmin();
    const oldToken = (await login(a.email)).body.data.accessToken as string;
    await api().get(`${V1}/admin/auth/me`).set({ Authorization: `Bearer ${oldToken}` }).expect(200);

    const token = await resetToken(a.id);
    await api().post(`${V1}/admin/auth/reset`).send({ token, password: 'Brand-new-pass-2' }).expect(200);
    const again = await api().post(`${V1}/admin/auth/reset`).send({ token, password: 'Another-pass-3x' }).expect(400);
    expect(again.body.error.code).toBe('RESET_TOKEN_INVALID');

    await api().get(`${V1}/admin/auth/me`).set({ Authorization: `Bearer ${oldToken}` }).expect(401);
    expect((await login(a.email)).status).toBe(401);
    const fresh = await login(a.email, 'Brand-new-pass-2');
    expect(fresh.status).toBe(200);
    expect(await prisma.auditLog.count({ where: { adminId: a.id, action: 'ADMIN_PASSWORD_RESET' } })).toBe(1);
  });

  t('expired tokens are rejected and change-password needs the current password', async () => {
    const a = await makeAdmin();
    const token = await resetToken(a.id);
    await prisma.adminPasswordReset.updateMany({ where: { tokenHash: sha256(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await api().post(`${V1}/admin/auth/reset`).send({ token, password: 'Brand-new-pass-2' }).expect(400);

    const access = (await login(a.email)).body.data.accessToken as string;
    const auth = { Authorization: `Bearer ${access}` };
    await api().post(`${V1}/admin/auth/change-password`).set(auth).send({ currentPassword: 'nope-nope-1', newPassword: 'Changed-pass-77' }).expect(400);
    await api().post(`${V1}/admin/auth/change-password`).set(auth).send({ currentPassword: PASSWORD, newPassword: 'Changed-pass-77' }).expect(200);
    await api().get(`${V1}/admin/auth/me`).set(auth).expect(401); // token predates the change
    expect((await login(a.email, 'Changed-pass-77')).status).toBe(200);
  });
});

describe('admin support desk', () => {
  t('staff reply notifies the user, flips status, and user reply reopens', async () => {
    const admin = await makeAdmin('SUPPORT');
    const auth = { Authorization: `Bearer ${(await login(admin.email)).body.data.accessToken}` };
    const user = await loginPhone();
    const tk = await api().post(`${V1}/support/tickets`).set(user.auth).send({ category: 'ACCOUNT', subject: 'Cannot update profile', message: 'The save button does nothing.' }).expect(201);
    const id = tk.body.data.id;

    const list = await api().get(`${V1}/admin/support/tickets`).set(auth).query({ status: 'OPEN' }).expect(200);
    expect(list.body.data.some((x: { id: string }) => x.id === id)).toBe(true);

    await api().post(`${V1}/admin/support/tickets/${id}/messages`).set(auth).send({ body: 'We are looking into it.' }).expect(201);
    const detail = await api().get(`${V1}/support/tickets/${id}`).set(user.auth).expect(200);
    expect(detail.body.data.status).toBe('WAITING_ON_USER');
    expect(detail.body.data.messages.at(-1)).toMatchObject({ fromStaff: true, authorName: 'help Support' });
    const notes = await api().get(`${V1}/notifications`).set(user.auth).expect(200);
    expect(notes.body.data.some((n: { category: string; link: string }) => n.category === 'ACCOUNT' && n.link === `/support/${id}`)).toBe(true);

    await api().post(`${V1}/support/tickets/${id}/messages`).set(user.auth).send({ body: 'Thanks, still failing.' }).expect(201);
    expect((await api().get(`${V1}/support/tickets/${id}`).set(user.auth)).body.data.status).toBe('OPEN');
    expect(await prisma.auditLog.count({ where: { adminId: admin.id, targetId: id } })).toBe(1);
  });
});
