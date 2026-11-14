import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/core';
import { getLastOtpForTest } from '../src/modules/auth/otp';
import { V1, api, dbReady, loginEmail, loginPhone, uniqueEmail } from './helpers';

let ready = false;
beforeAll(async () => {
  ready = await dbReady();
  if (!ready) console.warn('SKIPPED auth tests: database not reachable (set TEST_DATABASE_URL)');
});
const t = (name: string, fn: () => Promise<void>) => it(name, async (ctx) => (ready ? fn() : ctx.skip()));

describe('phone OTP + sessions', () => {
  t('logs in with OTP, rotates refresh tokens and detects reuse', async () => {
    const s = await loginPhone();
    const me = await api().get(`${V1}/auth/me`).set(s.auth).expect(200);
    expect(me.body.data.id).toBe(s.userId);

    const r1 = await api().post(`${V1}/auth/refresh`).send({ refreshToken: s.refresh }).expect(200);
    const second = r1.body.data.refreshToken;
    expect(second).not.toBe(s.refresh);

    // reusing the already-rotated token is rejected and revokes the whole family
    await api().post(`${V1}/auth/refresh`).send({ refreshToken: s.refresh }).expect(401);
    await api().post(`${V1}/auth/refresh`).send({ refreshToken: second }).expect(401);
  });

  t('rejects a wrong OTP', async () => {
    const phone = `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;
    await api().post(`${V1}/auth/otp/request`).send({ phone }).expect(200);
    const real = getLastOtpForTest(phone)!;
    const wrong = real === '000000' ? '111111' : '000000';
    const res = await api().post(`${V1}/auth/otp/verify`).send({ phone, code: wrong, platform: 'web' }).expect(400);
    expect(res.body.error.code).toBe('OTP_INVALID');
  });

  t('per-device logout only ends that session', async () => {
    const phone = `+9197${Math.floor(10000000 + Math.random() * 89999999)}`;
    const a = await loginPhone(phone, 'android', 'Pixel');
    // second device: needs a new code (cooldown applies per phone, so clear it)
    await prisma.otpChallenge.deleteMany({ where: { phone } });
    const b = await loginPhone(phone, 'ios', 'iPhone');
    expect(b.userId).toBe(a.userId);

    await api().post(`${V1}/auth/logout`).set(a.auth).expect(200);
    await api().get(`${V1}/auth/me`).set(a.auth).expect(401);
    await api().get(`${V1}/auth/me`).set(b.auth).expect(200);

    const sessions = await api().get(`${V1}/auth/sessions`).set(b.auth).expect(200);
    const other = sessions.body.data.find((x: { current: boolean }) => !x.current);
    expect(other).toBeUndefined(); // device A already ended
  });
});

describe('email OTP', () => {
  t('creates an account on first verify and signs the same user in next time', async () => {
    const email = uniqueEmail();
    const first = await loginEmail(email);
    const me = await api().get(`${V1}/auth/me`).set(first.auth).expect(200);
    expect(me.body.data.emailVerified).toBe(true);
    expect(me.body.data.linked.email).toBe(true);
    await prisma.otpChallenge.deleteMany({ where: { phone: email } });
    const again = await loginEmail(email);
    expect(again.userId).toBe(first.userId);
    // welcome email queued exactly once
    expect(await prisma.emailLog.count({ where: { dedupeKey: `welcome:${first.userId}` } })).toBe(1);
  });

  t('links to an existing account that owns the verified email', async () => {
    const email = uniqueEmail();
    const phoneUser = await loginPhone();
    await prisma.user.update({ where: { id: phoneUser.userId }, data: { email, emailVerified: true } });
    const viaEmail = await loginEmail(email);
    expect(viaEmail.userId).toBe(phoneUser.userId);
  });

  t('linkEmail refuses an email owned by another account (409 IDENTITY_TAKEN)', async () => {
    const email = uniqueEmail();
    await loginEmail(email); // owner
    const other = await loginPhone();
    await prisma.otpChallenge.deleteMany({ where: { phone: email } }); // skip resend cooldown
    await api().post(`${V1}/auth/email/request`).send({ email }).expect(200);
    const res = await api().post(`${V1}/auth/link/email`).set(other.auth).send({ email, code: getLastOtpForTest(email) }).expect(409);
    expect(res.body.error.code).toBe('IDENTITY_TAKEN');
  });

  t('linkEmail attaches a free email to a phone account (recovery path)', async () => {
    const email = uniqueEmail();
    const s = await loginPhone();
    await api().post(`${V1}/auth/email/request`).send({ email }).expect(200);
    const res = await api().post(`${V1}/auth/link/email`).set(s.auth).send({ email, code: getLastOtpForTest(email) }).expect(200);
    expect(res.body.data.linked.email).toBe(true);
    await prisma.otpChallenge.deleteMany({ where: { phone: email } });
    const viaEmail = await loginEmail(email);
    expect(viaEmail.userId).toBe(s.userId);
  });
});
