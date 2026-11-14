import { createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/core';
import { V1, activateSubscription, api, dbReady, makeProvider, rand } from './helpers';

const SECRET = 'whsec_test_secret';
let ready = false;
beforeAll(async () => {
  ready = await dbReady();
  if (!ready) console.warn('SKIPPED subscription tests: database not reachable');
});
const t = (name: string, fn: () => Promise<void>) => it(name, async (ctx) => (ready ? fn() : ctx.skip()));

const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');
const hook = (event: string, subId: string, eventId: string, opts: { currentEnd?: number } = {}, signature?: string) => {
  const body = JSON.stringify({ event, payload: { subscription: { entity: { id: subId, status: 'active', current_start: Math.floor(Date.now() / 1000), current_end: opts.currentEnd ?? Math.floor(Date.now() / 1000) + 30 * 86400 } } } });
  return api().post(`${V1}/payments/webhooks/razorpay`).set('content-type', 'application/json').set('x-razorpay-event-id', eventId).set('x-razorpay-signature', signature ?? sign(body)).send(body);
};

async function pendingSub(providerId: string) {
  const plan = await prisma.subscriptionPlan.findFirstOrThrow({ where: { code: 'PRO_MONTHLY' } });
  const razorpaySubscriptionId = `sub_wh_${rand(10)}`;
  await prisma.subscription.deleteMany({ where: { providerId } });
  const sub = await prisma.subscription.create({ data: { providerId, planId: plan.id, status: 'PENDING', razorpaySubscriptionId } });
  return { sub, razorpaySubscriptionId };
}

describe('razorpay webhook', () => {
  t('rejects a bad signature with 400', async () => {
    await hook('subscription.activated', 'sub_x', `evt_${rand(8)}`, {}, 'deadbeef').expect(400);
  });

  t('activation makes the provider discoverable; duplicate event is idempotent', async () => {
    const p = await makeProvider({ lat: 12.9, lng: 77.6, subscribed: false });
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.providerId } })).isDiscoverable).toBe(false);
    const { razorpaySubscriptionId } = await pendingSub(p.providerId);
    const eventId = `evt_${rand(10)}`;
    await hook('subscription.activated', razorpaySubscriptionId, eventId).expect(200);
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.providerId } })).isDiscoverable).toBe(true);
    const dup = await hook('subscription.activated', razorpaySubscriptionId, eventId).expect(200);
    expect(dup.body.data.duplicate).toBe(true);
    expect(await prisma.subscriptionEvent.count({ where: { subscription: { providerId: p.providerId }, toStatus: 'ACTIVE' } })).toBe(1);
  });

  t('cancelled (period over) and expired subscriptions hide the provider', async () => {
    const p = await makeProvider({ lat: 12.9, lng: 77.6, subscribed: false });
    const { razorpaySubscriptionId } = await pendingSub(p.providerId);
    await hook('subscription.activated', razorpaySubscriptionId, `evt_${rand(10)}`).expect(200);
    await hook('subscription.cancelled', razorpaySubscriptionId, `evt_${rand(10)}`, { currentEnd: Math.floor(Date.now() / 1000) - 3600 }).expect(200);
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.providerId } })).isDiscoverable).toBe(false);
    // profile is never deleted
    expect(await prisma.providerProfile.count({ where: { id: p.providerId, deletedAt: null } })).toBe(1);

    const q = await makeProvider({ lat: 12.9, lng: 77.6, subscribed: true });
    await activateSubscription(q.providerId, 'EXPIRED', new Date(Date.now() - 86_400_000));
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { id: q.providerId } })).isDiscoverable).toBe(false);
  });
});
