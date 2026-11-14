import type { SubscriptionStatus } from '@help/domain';
import { notifyUser } from '../../integrations/notify';
import { prisma } from '../../lib/core';

const MESSAGES: Partial<Record<SubscriptionStatus, { type: string; title: string; body: string; email: string; important?: boolean }>> = {
  ACTIVE: { type: 'SUBSCRIPTION_ACTIVE', title: 'Your profile is live', body: 'Your subscription is active and customers can now find you.', email: 'subscription-confirmed' },
  PAST_DUE: { type: 'PAYMENT_FAILED', title: 'Payment failed', body: 'We could not renew your plan. Update your payment method to stay visible.', email: 'payment-failed', important: true },
  CANCELLED: { type: 'SUBSCRIPTION_CANCELLED', title: 'Subscription cancelled', body: 'Renewals are off. Your profile stays visible until your paid period ends.', email: 'subscription-cancelled' },
  HALTED: { type: 'SUBSCRIPTION_HALTED', title: 'Profile hidden', body: 'Payments failed repeatedly, so your profile is hidden. Resubscribe to go live again.', email: 'payment-failed', important: true },
  EXPIRED: { type: 'SUBSCRIPTION_EXPIRED', title: 'Subscription ended', body: 'Your plan has ended. Your profile and reviews are saved — resubscribe anytime.', email: 'subscription-expired' },
};

export async function notifySubscriptionChange(providerId: string, _from: SubscriptionStatus, to: SubscriptionStatus) {
  const msg = MESSAGES[to];
  if (!msg) return;
  const p = await prisma.providerProfile.findUnique({ where: { id: providerId }, select: { userId: true } });
  if (!p) return;
  await notifyUser(p.userId, {
    type: msg.type,
    category: 'PAYMENTS',
    title: msg.title,
    body: msg.body,
    link: '/provider/subscription',
    important: msg.important,
    data: { providerId },
    email: { template: msg.email, dedupeKey: `${msg.type}:${providerId}:${new Date().toISOString().slice(0, 10)}` },
  });
}
