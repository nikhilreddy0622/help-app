import { isEntitled, LIVE_SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@help/domain';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/core';

type Tx = Prisma.TransactionClient | typeof prisma;

/** Latest relevant subscription for a provider (live first, then most recent). */
export async function currentSubscription(providerId: string, tx: Tx = prisma) {
  const live = await tx.subscription.findFirst({
    where: { providerId, status: { in: [...LIVE_SUBSCRIPTION_STATUSES] as SubscriptionStatus[] } },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  return live ?? tx.subscription.findFirst({ where: { providerId }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
}

export async function providerEntitled(providerId: string, tx: Tx = prisma, now = new Date()): Promise<boolean> {
  const sub = await currentSubscription(providerId, tx);
  return isEntitled(sub, now, env.SUBSCRIPTION_GRACE_DAYS);
}

/**
 * Recompute the denormalised `isDiscoverable` flag. Called after any
 * subscription change, publish/unpublish, admin hide, or by the expiry job.
 * Never deletes profile data (PRD §14).
 */
export async function refreshDiscoverability(providerId: string, tx: Tx = prisma): Promise<boolean> {
  const profile = await tx.providerProfile.findUnique({ where: { id: providerId }, select: { status: true, deletedAt: true, isPaused: true } });
  if (!profile) return false;
  const discoverable = profile.status === 'PUBLISHED' && !profile.deletedAt && !profile.isPaused && (await providerEntitled(providerId, tx));
  await tx.providerProfile.update({ where: { id: providerId }, data: { isDiscoverable: discoverable } });
  return discoverable;
}
