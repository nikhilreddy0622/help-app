import { isEntitled, nextSubscriptionStatus, type RazorpaySubEvent, type SubscriptionStatus } from '@help/domain';
import type { CheckoutSession, PaymentDto, SubscriptionDto, SubscriptionPlanDto } from '@help/types';
import type { Prisma, Subscription, SubscriptionPlan } from '@prisma/client';
import { env } from '../../config/env';
import { logger, prisma } from '../../lib/core';
import { AppError, badRequest, conflict, notFound } from '../../lib/http';
import { currentSubscription, refreshDiscoverability } from '../providers/entitlement';
import { notifySubscriptionChange } from './notify';
import { ensureRazorpayPlan, razorpay, verifyCheckoutSignature } from './razorpay';

export const planDto = (p: SubscriptionPlan): SubscriptionPlanDto => ({
  id: p.id, code: p.code, name: p.name, interval: p.interval, pricePaise: p.pricePaise, features: p.features,
});

export function subscriptionDto(s: Subscription & { plan: SubscriptionPlan }, now = new Date()): SubscriptionDto {
  const graceMs = env.SUBSCRIPTION_GRACE_DAYS * 86_400_000;
  return {
    id: s.id,
    status: s.status,
    plan: planDto(s.plan),
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    entitled: isEntitled(s, now, env.SUBSCRIPTION_GRACE_DAYS),
    graceEndsAt: s.status === 'PAST_DUE' && s.pastDueSince ? new Date(s.pastDueSince.getTime() + graceMs).toISOString() : null,
  };
}

export async function listPlans() {
  return (await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { pricePaise: 'asc' } })).map(planDto);
}

async function providerFor(userId: string) {
  const p = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!p) throw badRequest('Create your professional profile first');
  return p;
}

/** Step 2 of PRD lifecycle: backend creates the Razorpay subscription. */
export async function createCheckout(userId: string, planId: string): Promise<CheckoutSession> {
  const provider = await providerFor(userId);
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw notFound('Plan');

  const existing = await currentSubscription(provider.id);
  if (existing && ['ACTIVE', 'PAST_DUE'].includes(existing.status)) throw conflict('You already have an active subscription', 'ALREADY_SUBSCRIBED');
  // Reuse a pending checkout for the same plan instead of creating duplicates.
  if (existing && existing.status === 'INCOMPLETE' && existing.planId === plan.id && existing.razorpaySubscriptionId) {
    return { subscriptionId: existing.id, razorpaySubscriptionId: existing.razorpaySubscriptionId, razorpayKeyId: env.RAZORPAY_KEY_ID!, plan: planDto(plan) };
  }

  const razorpayPlanId = await ensureRazorpayPlan(plan);
  if (!plan.razorpayPlanId) await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { razorpayPlanId } });

  const rz = await razorpay().subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: plan.interval === 'MONTHLY' ? 120 : 10,
    customer_notify: 1,
    notes: { providerId: provider.id, planId: plan.id },
  });
  const sub = await prisma.subscription.create({
    data: { providerId: provider.id, planId: plan.id, status: 'INCOMPLETE', razorpaySubscriptionId: rz.id, history: { create: { toStatus: 'INCOMPLETE', source: 'checkout' } } },
  });
  return { subscriptionId: sub.id, razorpaySubscriptionId: rz.id, razorpayKeyId: env.RAZORPAY_KEY_ID!, plan: planDto(plan) };
}

/**
 * Step 4: verify the checkout signature. This moves INCOMPLETE → PENDING only.
 * ACTIVE is set exclusively by verified webhooks / reconciliation (PRD §15).
 */
export async function verifyCheckout(userId: string, body: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) {
  const provider = await providerFor(userId);
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: body.razorpay_subscription_id }, include: { plan: true } });
  if (!sub || sub.providerId !== provider.id) throw notFound('Subscription');
  if (!verifyCheckoutSignature(body.razorpay_payment_id, body.razorpay_subscription_id, body.razorpay_signature)) {
    throw new AppError(400, 'BAD_SIGNATURE', 'Payment could not be verified');
  }
  if (sub.status === 'INCOMPLETE') await applyStatus(sub.id, 'PENDING', 'verify');
  // Opportunistic reconcile: if Razorpay already shows it active, activate now.
  await reconcileOne(sub.id).catch((e) => logger.warn({ err: e }, 'reconcile after verify failed'));
  const fresh = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id }, include: { plan: true } });
  return subscriptionDto(fresh);
}

export async function getMySubscription(userId: string) {
  const provider = await providerFor(userId);
  const sub = await currentSubscription(provider.id);
  return sub ? subscriptionDto(sub) : null;
}

/** Cancel future renewals; access continues until paid-through date. */
export async function cancelMySubscription(userId: string) {
  const provider = await providerFor(userId);
  const sub = await currentSubscription(provider.id);
  if (!sub || !['ACTIVE', 'PAST_DUE', 'PENDING'].includes(sub.status)) throw badRequest('No active subscription to cancel');
  if (sub.razorpaySubscriptionId) await razorpay().subscriptions.cancel(sub.razorpaySubscriptionId, true);
  await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
  return subscriptionDto({ ...sub, cancelAtPeriodEnd: true });
}

export async function paymentHistory(userId: string): Promise<PaymentDto[]> {
  const provider = await providerFor(userId);
  const payments = await prisma.payment.findMany({ where: { subscription: { providerId: provider.id } }, orderBy: { createdAt: 'desc' }, take: 100 });
  return payments.map((p) => ({ id: p.id, amountPaise: p.amountPaise, status: p.status, method: p.method, paidAt: p.paidAt?.toISOString() ?? null, invoiceUrl: p.invoiceUrl }));
}

/** Single place that changes subscription status: writes history + refreshes discoverability atomically. */
export async function applyStatus(
  subscriptionId: string,
  to: SubscriptionStatus,
  source: string,
  extra: Partial<Prisma.SubscriptionUncheckedUpdateInput> = {},
  eventId?: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    const changed = sub.status !== to;
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...extra,
        status: to,
        lastEventAt: new Date(),
        pastDueSince: to === 'PAST_DUE' ? (sub.pastDueSince ?? new Date()) : to === 'ACTIVE' ? null : sub.pastDueSince,
        cancelledAt: to === 'CANCELLED' && !sub.cancelledAt ? new Date() : sub.cancelledAt,
      },
    });
    if (changed) await tx.subscriptionEvent.create({ data: { subscriptionId, fromStatus: sub.status, toStatus: to, source, eventId } });
    await refreshDiscoverability(sub.providerId, tx);
    return { changed, providerId: sub.providerId, from: sub.status };
  });
  if (result.changed) await notifySubscriptionChange(result.providerId, result.from, to).catch((e) => logger.error({ err: e }, 'subscription notify failed'));
  return result;
}

interface RzSubscriptionEntity { id: string; status: string; current_start?: number | null; current_end?: number | null }
interface RzPaymentEntity { id: string; amount: number; status: string; method?: string; invoice_id?: string | null; error_description?: string | null; created_at?: number }

const ts = (n?: number | null) => (n ? new Date(n * 1000) : undefined);

/** Apply one Razorpay subscription event (already signature-verified + deduped). */
export async function handleSubscriptionEvent(event: RazorpaySubEvent, entity: RzSubscriptionEntity, payment: RzPaymentEntity | undefined, eventId: string) {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: entity.id } });
  if (!sub) {
    logger.warn({ rz: entity.id, event }, 'webhook for unknown subscription');
    return;
  }
  if (payment) await recordPayment(sub.id, payment);
  const to = nextSubscriptionStatus(sub.status, event);
  const period = { currentPeriodStart: ts(entity.current_start), currentPeriodEnd: ts(entity.current_end) };
  if (to) await applyStatus(sub.id, to, 'webhook', period, eventId);
  else if (period.currentPeriodEnd) await prisma.subscription.update({ where: { id: sub.id }, data: period });
}

export async function recordPayment(subscriptionId: string, p: RzPaymentEntity) {
  const status = p.status === 'captured' ? 'CAPTURED' : p.status === 'failed' ? 'FAILED' : p.status === 'refunded' ? 'REFUNDED' : p.status === 'authorized' ? 'AUTHORIZED' : 'CREATED';
  await prisma.payment.upsert({
    where: { razorpayPaymentId: p.id },
    create: {
      subscriptionId, razorpayPaymentId: p.id, razorpayInvoiceId: p.invoice_id ?? null, amountPaise: p.amount, status,
      method: p.method ?? null, failureReason: p.error_description ?? null, paidAt: status === 'CAPTURED' ? (ts(p.created_at) ?? new Date()) : null,
    },
    update: { status, failureReason: p.error_description ?? null, ...(status === 'CAPTURED' ? { paidAt: ts(p.created_at) ?? new Date() } : {}) },
  });
}

const RZ_STATUS_EVENT: Record<string, RazorpaySubEvent | undefined> = {
  authenticated: 'subscription.authenticated',
  active: 'subscription.activated',
  pending: 'subscription.pending',
  halted: 'subscription.halted',
  cancelled: 'subscription.cancelled',
  completed: 'subscription.completed',
  expired: 'subscription.completed',
  paused: 'subscription.paused',
};

/** Pull truth from Razorpay for one subscription (used after verify and by the reconcile job). */
export async function reconcileOne(subscriptionId: string) {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  if (!sub.razorpaySubscriptionId) return;
  const rz = (await razorpay().subscriptions.fetch(sub.razorpaySubscriptionId)) as unknown as RzSubscriptionEntity;
  const event = RZ_STATUS_EVENT[rz.status];
  if (!event) return;
  const to = nextSubscriptionStatus(sub.status, event);
  const period = { currentPeriodStart: ts(rz.current_start), currentPeriodEnd: ts(rz.current_end) };
  if (to && to !== sub.status) await applyStatus(sub.id, to, 'reconcile', period);
}
