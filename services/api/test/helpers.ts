import { randomInt } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/core';
import { getLastOtpForTest } from '../src/modules/auth/otp';
import { refreshDiscoverability } from '../src/modules/providers/entitlement';
import { seedCatalog } from '../src/seed';

export const app = createApp();
export const api = () => request(app);
export const V1 = '/api/v1';

export async function dbReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.category.count();
    return true;
  } catch {
    return false;
  }
}

export const rand = (n = 9): string => (n <= 9 ? String(randomInt(0, 10 ** n)).padStart(n, '0') : rand(9) + rand(n - 9));
export const uniquePhone = () => `+91${6 + randomInt(0, 4)}${rand(9)}`;
export const uniqueEmail = () => `t${rand(10)}@example.test`;

export interface Session { userId: string; access: string; refresh: string; auth: { Authorization: string } }

export async function loginPhone(phone = uniquePhone(), platform = 'web', deviceName?: string): Promise<Session & { phone: string }> {
  await api().post(`${V1}/auth/otp/request`).send({ phone }).expect(200);
  const code = getLastOtpForTest(phone)!;
  const res = await api().post(`${V1}/auth/otp/verify`).send({ phone, code, platform, deviceName }).expect(200);
  const { tokens, me } = res.body.data;
  return { phone, userId: me.id, access: tokens.accessToken, refresh: tokens.refreshToken, auth: { Authorization: `Bearer ${tokens.accessToken}` } };
}

export async function loginEmail(email = uniqueEmail()): Promise<Session & { email: string }> {
  await api().post(`${V1}/auth/email/request`).send({ email }).expect(200);
  const res = await api().post(`${V1}/auth/email/verify`).send({ email, code: getLastOtpForTest(email), platform: 'web' }).expect(200);
  const { tokens, me } = res.body.data;
  return { email, userId: me.id, access: tokens.accessToken, refresh: tokens.refreshToken, auth: { Authorization: `Bearer ${tokens.accessToken}` } };
}

export async function anyCategory() {
  await seedCatalog();
  return prisma.category.findFirstOrThrow({ where: { slug: 'plumbers' } });
}

/** Test-only: make a provider's subscription ACTIVE (the real path is the verified Razorpay webhook). */
export async function activateSubscription(providerId: string, status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE', periodEnd = new Date(Date.now() + 30 * 86_400_000)) {
  const plan = await prisma.subscriptionPlan.findFirstOrThrow({ where: { code: 'PRO_MONTHLY' } });
  const existing = await prisma.subscription.findFirst({ where: { providerId } });
  if (existing) await prisma.subscription.update({ where: { id: existing.id }, data: { status, currentPeriodEnd: periodEnd } });
  else await prisma.subscription.create({ data: { providerId, planId: plan.id, status, razorpaySubscriptionId: `sub_t_${rand(10)}`, currentPeriodStart: new Date(), currentPeriodEnd: periodEnd } });
  await refreshDiscoverability(providerId);
}

export interface TestProvider extends Session { providerId: string; slug: string; phone: string }

/** A published provider near the given point, optionally with an active subscription. Always available (Mon-Sun 00:00-24:00). */
export async function makeProvider(opts: { lat: number; lng: number; subscribed?: boolean; name?: string }): Promise<TestProvider> {
  const s = await loginPhone();
  const cat = await anyCategory();
  const basics = await api().post(`${V1}/providers/me`).set(s.auth).send({
    displayName: opts.name ?? `Test Pro ${rand(5)}`, headline: 'Reliable plumbing', primaryCategoryId: cat.id, experienceYears: 5,
  }).expect(201);
  await api().put(`${V1}/providers/me/location`).set(s.auth).send({
    city: 'Testville', pinCode: '560001', locality: 'Test Nagar', lat: opts.lat, lng: opts.lng, serviceRadiusKm: 10, serviceMode: 'ONSITE', areasServed: [],
  }).expect(200);
  await api().post(`${V1}/providers/me/services`).set(s.auth).send({ title: 'Visit', priceUnit: 'PER_VISIT', pricePaise: 30000 }).expect(201);
  await api().put(`${V1}/availability/me`).set(s.auth).send({
    timezone: 'Asia/Kolkata', appointmentOnly: false, rules: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 0, endMinute: 1440 })),
  }).expect(200);
  await api().post(`${V1}/providers/me/publish`).set(s.auth).expect(200);
  if (opts.subscribed !== false) await activateSubscription(basics.body.data.id);
  const me = await api().get(`${V1}/providers/me`).set(s.auth).expect(200);
  return { ...s, providerId: basics.body.data.id, slug: me.body.data.slug };
}

/** Customer starts a chat with the provider; returns the conversation DTO. */
export async function startChat(customer: Session, provider: TestProvider, message = 'Hi, are you available for a visit?') {
  const res = await api().post(`${V1}/conversations`).set(customer.auth).send({ providerId: provider.providerId, message }).expect(201);
  return res.body.data as { id: string; canReview: boolean; unread: number };
}

export const reply = (session: Session, conversationId: string, body = 'Sure, happy to help.') =>
  api().post(`${V1}/conversations/${conversationId}/messages`).set(session.auth).send({ body });
