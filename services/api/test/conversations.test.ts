import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/core';
import { V1, activateSubscription, api, dbReady, loginPhone, makeProvider, reply, startChat, type Session, type TestProvider } from './helpers';

let ready = false;
// A random remote spot per run so leftovers from earlier runs never match.
const BASE = { lat: 10 + Math.random() * 18, lng: 70 + Math.random() * 18 };
let pro: TestProvider;
let customer: Session & { phone: string };
let stranger: Session;

beforeAll(async () => {
  ready = await dbReady();
  if (!ready) {
    console.warn('SKIPPED conversation tests: database not reachable (set TEST_DATABASE_URL)');
    return;
  }
  pro = await makeProvider({ ...BASE });
  customer = await loginPhone();
  stranger = await loginPhone();
});
const t = (name: string, fn: () => Promise<void>) => it(name, async (ctx) => (ready ? fn() : ctx.skip()));

describe('conversations', () => {
  t('start is find-or-create per customer-provider pair', async () => {
    const c = await loginPhone();
    const first = await startChat(c, pro, 'Hello there, need a quote');
    const again = await startChat(c, pro, 'Following up on my message');
    expect(again.id).toBe(first.id);
    expect(await prisma.conversation.count({ where: { customerId: c.userId, providerId: pro.providerId } })).toBe(1);
    const msgs = await api().get(`${V1}/conversations/${first.id}/messages`).set(c.auth).expect(200);
    expect(msgs.body.data).toHaveLength(2);
    expect(msgs.body.data[0].body).toBe('Following up on my message'); // newest first
    expect(await prisma.contactEvent.count({ where: { providerId: pro.providerId, userId: c.userId, kind: 'CHAT_STARTED' } })).toBe(1);

    // provider sees it with unread and a recipient notification was created
    const list = await api().get(`${V1}/conversations`).set(pro.auth).query({ role: 'provider' }).expect(200);
    const row = list.body.data.find((x: { id: string }) => x.id === first.id);
    expect(row.unread).toBe(2);
    expect(row.role).toBe('provider');
    await api().post(`${V1}/conversations/${first.id}/read`).set(pro.auth).expect(200);
    const after = await api().get(`${V1}/conversations/${first.id}`).set(pro.auth).expect(200);
    expect(after.body.data.unread).toBe(0);
    const notes = await api().get(`${V1}/notifications`).set(pro.auth).expect(200);
    const n = notes.body.data.find((x: { groupKey: string }) => x.groupKey === `msg:${first.id}`);
    expect(n).toMatchObject({ category: 'MESSAGES', link: `/messages/${first.id}` });
  });

  t('refuses self, paused, unsubscribed and blocked', async () => {
    const self = await api().post(`${V1}/conversations`).set(pro.auth).send({ providerId: pro.providerId, message: 'talking to myself' }).expect(400);
    expect(self.body.error.code).toBe('SELF_CONVERSATION');

    const paused = await makeProvider({ ...BASE });
    await api().put(`${V1}/providers/me/visibility`).set(paused.auth).send({ visible: false }).expect(200);
    const r1 = await api().post(`${V1}/conversations`).set(customer.auth).send({ providerId: paused.providerId, message: 'anyone home?' }).expect(409);
    expect(r1.body.error.code).toBe('PROVIDER_UNAVAILABLE');

    const unsub = await makeProvider({ ...BASE, subscribed: false });
    const r2 = await api().post(`${V1}/conversations`).set(customer.auth).send({ providerId: unsub.providerId, message: 'anyone home?' }).expect(409);
    expect(r2.body.error.code).toBe('PROVIDER_UNAVAILABLE');

    const blocker = await loginPhone();
    await api().post(`${V1}/providers/${pro.providerId}/block`).set(blocker.auth).expect(200);
    const r3 = await api().post(`${V1}/conversations`).set(blocker.auth).send({ providerId: pro.providerId, message: 'I blocked you' }).expect(403);
    expect(r3.body.error.code).toBe('BLOCKED');
  });

  t('non-participants cannot read, post, mark read or list a conversation (IDOR)', async () => {
    const c = await loginPhone();
    const conv = await startChat(c, pro);
    await api().get(`${V1}/conversations/${conv.id}`).set(stranger.auth).expect(404);
    await api().get(`${V1}/conversations/${conv.id}/messages`).set(stranger.auth).expect(404);
    await api().post(`${V1}/conversations/${conv.id}/messages`).set(stranger.auth).send({ body: 'hi' }).expect(404);
    await api().post(`${V1}/conversations/${conv.id}/read`).set(stranger.auth).expect(404);
    const list = await api().get(`${V1}/conversations`).set(stranger.auth).expect(200);
    expect(list.body.data.find((x: { id: string }) => x.id === conv.id)).toBeUndefined();
    // another customer cannot see it either
    await api().get(`${V1}/conversations/${conv.id}`).set(customer.auth).expect(404);
  });

  t('Busy/Away providers send exactly one auto-reply per status period, which is not a real reply', async () => {
    const p = await makeProvider({ ...BASE });
    const c = await loginPhone();
    const until = new Date(Date.now() + 3 * 3_600_000).toISOString();
    await api().put(`${V1}/providers/me/status`).set(p.auth).send({ status: 'BUSY', message: 'On a job, back by 6 PM', until }).expect(200);

    const conv = await startChat(c, p, 'Hi, quick question');
    await reply(c, conv.id, 'Are you there?').expect(201);
    let msgs = await api().get(`${V1}/conversations/${conv.id}/messages`).set(c.auth).expect(200);
    const autos = msgs.body.data.filter((m: { auto: boolean }) => m.auto);
    expect(autos).toHaveLength(1);
    expect(autos[0].body).toBe('On a job, back by 6 PM');
    expect(autos[0].senderId).toBe(p.userId);

    // auto-reply does not unlock reviews
    const row = await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } });
    expect(row.providerFirstReplyAt).toBeNull();
    const elig = await api().get(`${V1}/reviews/eligibility/${p.providerId}`).set(c.auth).expect(200);
    expect(elig.body.data).toEqual({ canReview: false, reason: 'NO_INTERACTION' });

    // a new status period allows one more auto-reply
    await api().put(`${V1}/providers/me/status`).set(p.auth).send({ status: 'AWAY', message: 'Available from Monday', until }).expect(200);
    await reply(c, conv.id, 'Still waiting').expect(201);
    await reply(c, conv.id, 'Hello?').expect(201);
    msgs = await api().get(`${V1}/conversations/${conv.id}/messages`).set(c.auth).query({ limit: 50 }).expect(200);
    expect(msgs.body.data.filter((m: { auto: boolean }) => m.auto)).toHaveLength(2);

    // disabled auto-reply sends nothing
    await api().put(`${V1}/providers/me/contact-settings`).set(p.auth).send({ showPhone: true, autoReplyEnabled: false, autoReplyText: null }).expect(200);
    await api().put(`${V1}/providers/me/status`).set(p.auth).send({ status: 'BUSY', message: 'Busy again', until }).expect(200);
    await reply(c, conv.id, 'One more').expect(201);
    msgs = await api().get(`${V1}/conversations/${conv.id}/messages`).set(c.auth).query({ limit: 50 }).expect(200);
    expect(msgs.body.data.filter((m: { auto: boolean }) => m.auto)).toHaveLength(2);
  });
});

describe('reviews', () => {
  t('only after the provider replied, once, shown as "First L."', async () => {
    const c = await loginPhone();
    await api().patch(`${V1}/users/me`).set(c.auth).send({ name: 'Rahul Sharma' }).expect(200);
    const review = { providerId: pro.providerId, overall: 5, quality: 5, behaviour: 4, punctuality: 5, value: 4, communication: 5, comment: 'Great' };

    const anon = await api().get(`${V1}/reviews/eligibility/${pro.providerId}`).expect(200);
    expect(anon.body.data).toEqual({ canReview: false, reason: 'SIGNED_OUT' });
    const none = await api().post(`${V1}/reviews`).set(c.auth).send(review).expect(409);
    expect(none.body.error.details.reason).toBe('NO_INTERACTION');

    const conv = await startChat(c, pro, 'Do you do emergency repairs?');
    const stillNo = await api().post(`${V1}/reviews`).set(c.auth).send(review).expect(409);
    expect(stillNo.body.error.details.reason).toBe('NO_INTERACTION'); // provider has not replied yet

    await reply(pro, conv.id, 'Yes we do, call anytime.').expect(201);
    const mine = await api().get(`${V1}/conversations/${conv.id}`).set(c.auth).expect(200);
    expect(mine.body.data.canReview).toBe(true);
    expect((await api().get(`${V1}/reviews/eligibility/${pro.providerId}`).set(c.auth)).body.data.canReview).toBe(true);

    await api().post(`${V1}/reviews`).set(stranger.auth).send(review).expect(409); // never chatted
    const r = await api().post(`${V1}/reviews`).set(c.auth).send(review).expect(201);
    expect(r.body.data.authorName).toBe('Rahul S.');
    const again = await api().post(`${V1}/reviews`).set(c.auth).send(review).expect(409);
    expect(again.body.error.details.reason).toBe('ALREADY_REVIEWED');
    expect((await api().get(`${V1}/conversations/${conv.id}`).set(c.auth)).body.data.canReview).toBe(false);

    const prov = await prisma.providerProfile.findUniqueOrThrow({ where: { id: pro.providerId } });
    expect(prov.ratingCount).toBeGreaterThanOrEqual(1);
    await api().post(`${V1}/reviews/${r.body.data.id}/reply`).set(pro.auth).send({ reply: 'Thanks!' }).expect(200);
    await api().post(`${V1}/reviews/${r.body.data.id}/reply`).set(pro.auth).send({ reply: 'Again' }).expect(409);
    await api().post(`${V1}/reviews/${r.body.data.id}/reply`).set(c.auth).send({ reply: 'I am the author' }).expect(404);
  });
});

describe('reveal phone', () => {
  t('needs login, respects showPhone and logs a contact event', async () => {
    const p = await makeProvider({ ...BASE });
    await api().post(`${V1}/providers/${p.providerId}/phone`).expect(401);

    const ok1 = await api().post(`${V1}/providers/${p.providerId}/phone`).set(customer.auth).expect(200);
    expect(ok1.body.data.phone).toBe(p.phone);
    expect(await prisma.contactEvent.count({ where: { providerId: p.providerId, userId: customer.userId, kind: 'PHONE_REVEALED' } })).toBe(1);
    await api().post(`${V1}/providers/${p.providerId}/phone`).set(p.auth).expect(403); // own profile

    await api().put(`${V1}/providers/me/contact-settings`).set(p.auth).send({ showPhone: false, autoReplyEnabled: true, autoReplyText: null }).expect(200);
    const hidden = await api().post(`${V1}/providers/${p.providerId}/phone`).set(customer.auth).expect(403);
    expect(hidden.body.error.code).toBe('PHONE_HIDDEN');
    const profile = await api().get(`${V1}/providers/${p.slug}`).expect(200);
    expect(profile.body.data.phoneAvailable).toBe(false);
    expect(JSON.stringify(profile.body)).not.toContain(p.phone);

    const dash = await api().get(`${V1}/providers/me/dashboard`).set(p.auth).expect(200);
    expect(dash.body.data.phoneReveals30d).toBe(1);
  });
});

describe('discovery and presence', () => {
  t('returns only discoverable providers and never leaks phone or coordinates', async () => {
    const hidden = await makeProvider({ ...BASE, subscribed: false, name: 'Hidden Unsubscribed' });
    const res = await api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5 }).expect(200);
    const ids = res.body.data.map((x: { id: string }) => x.id);
    expect(ids).toContain(pro.providerId);
    expect(ids).not.toContain(hidden.providerId);

    const raw = JSON.stringify(res.body);
    for (const secret of [pro.phone, hidden.phone, '"lat"', '"lng"', '"phone"', '"email"']) expect(raw).not.toContain(secret);
    const card = res.body.data.find((x: { id: string }) => x.id === pro.providerId);
    expect(Math.round(card.distanceKm * 10) / 10).toBe(card.distanceKm);
    expect(card).toMatchObject({ status: 'AVAILABLE', statusLabel: 'Available now', availableNow: true, statusFresh: false });

    await activateSubscription(pro.providerId, 'EXPIRED', new Date(Date.now() - 86_400_000));
    const gone = await api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5 }).expect(200);
    expect(gone.body.data.map((x: { id: string }) => x.id)).not.toContain(pro.providerId);
    await activateSubscription(pro.providerId, 'ACTIVE');

    const profile = await api().get(`${V1}/providers/${pro.slug}`).expect(200);
    const praw = JSON.stringify(profile.body);
    expect(praw).not.toContain(pro.phone);
    expect(praw).not.toContain('"lat"');
    expect(profile.body.data.phoneAvailable).toBe(true);
  });

  t('categories come as groups with subcategories; a group filter includes its children', async () => {
    const list = await api().get(`${V1}/categories`).expect(200);
    const sub = list.body.data.find((c: { slug: string }) => c.slug === 'plumbers');
    const group = list.body.data.find((c: { id: string }) => c.id === sub.parentId);
    expect(group).toMatchObject({ slug: 'home-services', parentId: null });
    expect(group.providerCount).toBeGreaterThanOrEqual(sub.providerCount);
    expect(sub.providerCount).toBeGreaterThanOrEqual(1);
    const res = await api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5, categoryId: group.id }).expect(200);
    expect(res.body.data.map((x: { id: string }) => x.id)).toContain(pro.providerId);
    const other = list.body.data.find((c: { slug: string }) => c.slug === 'education');
    const none = await api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5, categoryId: other.id }).expect(200);
    expect(none.body.data.map((x: { id: string }) => x.id)).not.toContain(pro.providerId);
  });

  t('status changes show on cards, filter availableNow, and auto-return (domain + job)', async () => {
    const p = await makeProvider({ ...BASE, name: `Presence Pro ${Date.now() % 10000}` });
    const search = (extra: object = {}) => api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5, ...extra }).expect(200);
    const find = (res: { body: { data: { id: string }[] } }) => res.body.data.find((x) => x.id === p.providerId) as Record<string, unknown> | undefined;

    const until = new Date(Date.now() + 2 * 3_600_000).toISOString();
    const set = await api().put(`${V1}/providers/me/status`).set(p.auth).send({ status: 'BUSY', message: 'On a job, back by 6 PM', until }).expect(200);
    expect(set.body.data).toMatchObject({ status: 'BUSY', statusMessage: 'On a job, back by 6 PM', isPaused: false });
    const busy = find(await search());
    expect(busy).toMatchObject({ status: 'BUSY', availableNow: false, statusMessage: 'On a job, back by 6 PM', statusFresh: true });
    expect(String(busy!.statusLabel)).toContain('Busy');
    expect(find(await search({ availableNow: 'true' }))).toBeUndefined();

    // the end time passes: domain rule already shows Available; the job persists it and notifies
    await prisma.providerProfile.update({ where: { id: p.providerId }, data: { statusUntil: new Date(Date.now() - 60_000) } });
    expect(find(await search())).toMatchObject({ status: 'AVAILABLE', availableNow: true });
    const { statusAutoReturn } = await import('../src/jobs');
    await statusAutoReturn();
    const row = await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.providerId } });
    expect(row).toMatchObject({ presenceStatus: 'AVAILABLE', statusMessage: null, statusUntil: null });
    const notes = await api().get(`${V1}/notifications`).set(p.auth).expect(200);
    expect(notes.body.data.some((n: { category: string; title: string }) => n.category === 'STATUS' && n.title === "You're shown as Available again")).toBe(true);
    expect(String((await api().get(`${V1}/providers/me/dashboard`).set(p.auth).expect(200)).body.data.presence.status)).toBe('AVAILABLE');
  });

  t('paused providers are hidden from discovery and chat, and return when resumed', async () => {
    const p = await makeProvider({ ...BASE, name: `Pausable Pro ${Date.now() % 10000}` });
    const ids = async () => (await api().get(`${V1}/discovery/search`).query({ lat: BASE.lat, lng: BASE.lng, radiusKm: 5 }).expect(200)).body.data.map((x: { id: string }) => x.id);
    expect(await ids()).toContain(p.providerId);

    const off = await api().put(`${V1}/providers/me/visibility`).set(p.auth).send({ visible: false }).expect(200);
    expect(off.body.data.isPaused).toBe(true);
    expect(await ids()).not.toContain(p.providerId);
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.providerId } })).isDiscoverable).toBe(false);
    await api().get(`${V1}/providers/${p.slug}`).expect(404);

    await api().put(`${V1}/providers/me/visibility`).set(p.auth).send({ visible: true }).expect(200);
    expect(await ids()).toContain(p.providerId);
  });

  t('confirmStatus refreshes freshness; recently viewed and saves are tracked', async () => {
    const p = await makeProvider({ ...BASE });
    const c = await loginPhone();
    const before = (await api().get(`${V1}/providers/me/dashboard`).set(p.auth)).body.data.presence.statusUpdatedAt;
    expect(before).toBeNull();
    const conf = await api().post(`${V1}/providers/me/status/confirm`).set(p.auth).expect(200);
    expect(conf.body.data.statusUpdatedAt).not.toBeNull();

    await api().get(`${V1}/providers/${p.slug}`).set(c.auth).expect(200);
    await new Promise((r) => setTimeout(r, 100));
    const viewed = await api().get(`${V1}/users/me/recently-viewed`).set(c.auth).expect(200);
    expect(viewed.body.data.map((x: { id: string }) => x.id)).toContain(p.providerId);
    await api().put(`${V1}/users/me/saved/${p.providerId}`).set(c.auth).send({}).expect(200);
    const ins = await api().get(`${V1}/providers/me/insights`).set(p.auth).query({ days: 7 }).expect(200);
    expect(ins.body.data.totals.saves).toBe(1);
    expect(ins.body.data.series).toHaveLength(7);
  });
});

describe('support tickets', () => {
  t('are isolated per user', async () => {
    const created = await api().post(`${V1}/support/tickets`).set(customer.auth).send({ category: 'OTHER', subject: 'Question about fees', message: 'How do the fees work exactly?' }).expect(201);
    const id = created.body.data.id;
    await api().get(`${V1}/support/tickets/${id}`).set(customer.auth).expect(200);
    await api().get(`${V1}/support/tickets/${id}`).set(stranger.auth).expect(404);
    await api().post(`${V1}/support/tickets/${id}/messages`).set(stranger.auth).send({ body: 'sneaky reply' }).expect(404);
    await api().post(`${V1}/support/tickets/${id}/close`).set(stranger.auth).expect(404);
    const list = await api().get(`${V1}/support/tickets`).set(stranger.auth).expect(200);
    expect(list.body.data.find((x: { id: string }) => x.id === id)).toBeUndefined();
  });
});
