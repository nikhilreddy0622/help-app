import type { NotificationCategory, Prisma } from '@prisma/client';
import { logger, prisma } from '../lib/core';
import { emitToUser } from '../realtime/bus';
import { getPreferences, inQuietHours, toNotificationDto, unreadCounts } from '../modules/notifications/service';
import { queueEmail } from './email';
import { sendPush } from './push';

export interface NotifyInput {
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** In-app route e.g. /messages/:id */
  link?: string;
  imageUrl?: string | null;
  /** Rows sharing a groupKey collapse in the list (e.g. msg:<conversationId>). */
  groupKey?: string;
  /** Bypasses quiet hours and shows as a banner. */
  important?: boolean;
  data?: Record<string, unknown>;
  /** Optional transactional email; dedupeKey prevents duplicate sends. */
  email?: { template: string; dedupeKey: string; vars?: Record<string, unknown> };
  push?: boolean;
}

/** Transactional categories always email (receipts, security, payment issues). */
const ALWAYS_EMAIL: NotificationCategory[] = ['PAYMENTS', 'ACCOUNT'];

/**
 * Single entry point for user notifications: in-app record (always, plus
 * realtime SSE), push (FCM; respects prefs + quiet hours unless important)
 * and transactional email (queued, deduped, retried; respects prefs).
 */
export async function notifyUser(userId: string, n: NotifyInput): Promise<void> {
  const row = await prisma.notification.create({
    data: {
      userId,
      type: n.type,
      category: n.category,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
      imageUrl: n.imageUrl ?? null,
      groupKey: n.groupKey ?? null,
      important: n.important ?? false,
      data: (n.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  const prefs = await getPreferences(userId);

  try {
    const [counts, groupCount] = await Promise.all([
      unreadCounts(userId),
      n.groupKey ? prisma.notification.count({ where: { userId, groupKey: n.groupKey, readAt: null } }) : Promise.resolve(1),
    ]);
    await emitToUser(userId, { type: 'notification.created', notification: toNotificationDto(row, groupCount), unreadCount: counts.count });
  } catch (e) {
    logger.warn({ err: e }, 'realtime emit failed');
  }

  const ch = prefs.channels[n.category] ?? { push: true, email: true };
  const wantsPush = n.push !== false && ch.push && (n.important || !inQuietHours(prefs));
  if (wantsPush) {
    sendPush(userId, {
      title: n.title,
      body: n.body,
      channelId: n.category.toLowerCase(),
      data: { ...(n.data ?? {}), link: n.link ?? '', notificationId: row.id, category: n.category },
    }).catch((e) => logger.warn({ err: e }, 'push failed'));
  }

  if (n.email && (ALWAYS_EMAIL.includes(n.category) || ch.email)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user?.email) {
      await queueEmail({
        to: user.email,
        template: n.email.template,
        dedupeKey: n.email.dedupeKey,
        vars: { name: user.name ?? 'there', title: n.title, body: n.body, ...n.data, ...n.email.vars },
      });
    }
  }
}

/** Never throws: for call sites where notification failure must not break the main flow. */
export function notifySafe(userId: string, n: NotifyInput): Promise<void> {
  return notifyUser(userId, n).catch((e) => logger.warn({ err: e, type: n.type }, 'notify failed'));
}
