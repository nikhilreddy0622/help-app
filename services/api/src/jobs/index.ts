import PgBoss from 'pg-boss';
import { env } from '../config/env';
import { retryEmails } from '../integrations/email';
import { notifySafe } from '../integrations/notify';
import { logger, prisma } from '../lib/core';
import { refreshDiscoverability } from '../modules/providers/entitlement';
import { applyStatus, reconcileOne } from '../modules/subscriptions/service';
import { ensureListener, stopRealtime } from '../realtime/bus';

const HOUR = 3_600_000;

/** Wraps a job body so one failure is logged and never crashes the process. */
async function safely(name: string, fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    logger.info({ job: name, result: r }, 'job done');
    return r;
  } catch (e) {
    logger.error({ err: e, job: name }, 'job failed');
    return undefined;
  }
}

async function each<T>(items: T[], fn: (i: T) => Promise<unknown>, label: string) {
  let n = 0;
  for (const i of items) {
    try {
      await fn(i);
      n++;
    } catch (e) {
      logger.error({ err: e, label }, 'job item failed');
    }
  }
  return n;
}

/** Hourly: grace expiry, stale period ends, cancelled-expired, stuck PENDING. */
export async function subscriptionSweep(now = new Date()) {
  const grace = env.SUBSCRIPTION_GRACE_DAYS * 86_400_000;
  const pastDue = await prisma.subscription.findMany({ where: { status: 'PAST_DUE', pastDueSince: { lt: new Date(now.getTime() - grace) } }, select: { providerId: true } });
  const a = await each(pastDue, (s) => refreshDiscoverability(s.providerId), 'past-due');
  const active = await prisma.subscription.findMany({ where: { status: 'ACTIVE', currentPeriodEnd: { lt: new Date(now.getTime() - grace) } }, select: { id: true } });
  const b = await each(active, (s) => reconcileOne(s.id), 'active-overdue');
  const cancelled = await prisma.subscription.findMany({ where: { status: 'CANCELLED', currentPeriodEnd: { lt: now } }, select: { id: true } });
  const c = await each(cancelled, (s) => applyStatus(s.id, 'EXPIRED', 'job'), 'cancelled-expire');
  const pending = await prisma.subscription.findMany({ where: { status: 'PENDING', updatedAt: { lt: new Date(now.getTime() - 15 * 60_000) } }, select: { id: true } });
  const d = await each(pending, (s) => reconcileOne(s.id), 'pending-reconcile');
  return { pastDue: a, activeOverdue: b, cancelledExpired: c, pendingReconciled: d };
}

/** Hourly: Busy/Away whose end time passed returns to Available (same rule as the domain effectivePresence). */
export async function statusAutoReturn(now = new Date()) {
  const rows = await prisma.providerProfile.findMany({
    where: { presenceStatus: { not: 'AVAILABLE' }, statusUntil: { lte: now }, deletedAt: null },
    select: { id: true, userId: true },
  });
  return each(rows, async (p) => {
    const { count } = await prisma.providerProfile.updateMany({
      where: { id: p.id, presenceStatus: { not: 'AVAILABLE' }, statusUntil: { lte: now } },
      data: { presenceStatus: 'AVAILABLE', statusMessage: null, statusUntil: null },
    });
    if (count) {
      await notifySafe(p.userId, {
        type: 'STATUS_AUTO_RETURN', category: 'STATUS', title: "You're shown as Available again",
        body: 'Your Busy/Away time ended. Tap to change your status.', link: '/provider/status',
      });
    }
  }, 'status-auto-return');
}

/** Daily 9 AM IST: nudge visible providers whose status is older than 24h. Push/in-app only (no email). */
export async function statusNudges(now = new Date()) {
  const rows = await prisma.providerProfile.findMany({
    where: {
      status: 'PUBLISHED', isDiscoverable: true, isPaused: false, deletedAt: null,
      OR: [{ statusUpdatedAt: null }, { statusUpdatedAt: { lt: new Date(now.getTime() - 24 * HOUR) } }],
    },
    select: { userId: true, id: true },
    take: 1000,
  });
  return each(rows, (p) =>
    notifySafe(p.userId, {
      type: 'STATUS_NUDGE', category: 'STATUS', title: 'Are you available today?',
      body: 'Confirm your status so customers know when to reach you.', link: '/provider/status', data: { providerId: p.id },
    }), 'status-nudge');
}

/** Renewal reminder 3 days before the period ends (deduped per subscription+period). */
export async function renewalReminders(now = new Date()) {
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + 3 * 86_400_000) } },
    include: { provider: { select: { userId: true } }, plan: true },
  });
  return each(subs, (s) =>
    notifySafe(s.provider.userId, {
      type: 'RENEWAL_REMINDER', category: 'PAYMENTS', title: 'Your plan renews soon',
      body: `Your ${s.plan.name} plan renews on ${s.currentPeriodEnd!.toDateString()}.`,
      link: '/provider/subscription', data: { subscriptionId: s.id },
      email: { template: 'renewal-reminder', dedupeKey: `renewal-reminder:${s.id}:${s.currentPeriodEnd!.toISOString().slice(0, 10)}` },
    }), 'renewal');
}

const TASKS: { name: string; cron: string; tz?: string; run: () => Promise<unknown> }[] = [
  { name: 'subscription-sweep', cron: '0 * * * *', run: () => subscriptionSweep() },
  { name: 'status-auto-return', cron: '*/15 * * * *', run: () => statusAutoReturn() },
  { name: 'status-nudge', cron: '0 9 * * *', tz: 'Asia/Kolkata', run: () => statusNudges() },
  { name: 'renewal-reminders', cron: '0 9 * * *', tz: 'Asia/Kolkata', run: () => renewalReminders() },
  { name: 'email-retry', cron: '*/10 * * * *', run: () => retryEmails() },
];

let boss: PgBoss | null = null;

export async function startJobs(): Promise<void> {
  await ensureListener();
  try {
    boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: 'pgboss' });
    boss.on('error', (e) => logger.error({ err: e }, 'pg-boss error'));
    await boss.start();
    for (const t of TASKS) {
      await boss.createQueue(t.name);
      await boss.schedule(t.name, t.cron, undefined, t.tz ? { tz: t.tz } : undefined);
      await boss.work(t.name, async () => {
        await safely(t.name, t.run);
      });
    }
    logger.info('background jobs scheduled');
  } catch (e) {
    logger.error({ err: e }, 'could not start job scheduler');
    boss = null;
  }
}

export async function stopJobs(): Promise<void> {
  await stopRealtime().catch(() => undefined);
  if (boss) await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => undefined);
  boss = null;
}
