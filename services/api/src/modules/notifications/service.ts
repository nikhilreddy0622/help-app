import { localParts } from '@help/domain';
import type { NotificationDto, NotificationPreferences } from '@help/types';
import { NotificationPreferencesSchema } from '@help/validation';
import { Prisma, type Notification, type NotificationCategory } from '@prisma/client';
import { prisma } from '../../lib/core';

export const CATEGORIES: NotificationCategory[] = ['STATUS', 'MESSAGES', 'REVIEWS', 'PAYMENTS', 'ACCOUNT', 'PROMOTIONS'];

export function defaultPreferences(): NotificationPreferences {
  const channels = Object.fromEntries(
    CATEGORIES.map((c) => [c, c === 'PROMOTIONS' ? { push: false, email: false } : { push: true, email: true }]),
  ) as NotificationPreferences['channels'];
  return { channels, quietHours: { enabled: false, startMinute: 22 * 60, endMinute: 7 * 60, timezone: 'Asia/Kolkata' } };
}

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } });
  const d = defaultPreferences();
  if (!row) return d;
  const parsed = NotificationPreferencesSchema.safeParse({ channels: { ...d.channels, ...(row.channels as object) }, quietHours: { ...d.quietHours, ...(row.quietHours as object) } });
  return parsed.success ? (parsed.data as NotificationPreferences) : d;
}

export async function setPreferences(userId: string, prefs: NotificationPreferences): Promise<NotificationPreferences> {
  const data = { channels: prefs.channels as unknown as Prisma.InputJsonValue, quietHours: prefs.quietHours as unknown as Prisma.InputJsonValue };
  await prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return getPreferences(userId);
}

/** True when `now` falls inside the user's quiet hours (handles overnight windows). */
export function inQuietHours(prefs: NotificationPreferences, now = new Date()): boolean {
  const q = prefs.quietHours;
  if (!q.enabled || q.startMinute === q.endMinute) return false;
  let minute: number;
  try {
    minute = localParts(now, q.timezone).minute;
  } catch {
    minute = localParts(now, 'Asia/Kolkata').minute;
  }
  return q.startMinute < q.endMinute ? minute >= q.startMinute && minute < q.endMinute : minute >= q.startMinute || minute < q.endMinute;
}

export const toNotificationDto = (n: Notification, groupCount = 1): NotificationDto => ({
  id: n.id,
  type: n.type,
  category: n.category,
  title: n.title,
  body: n.body,
  link: n.link,
  imageUrl: n.imageUrl,
  groupKey: n.groupKey,
  groupCount: Math.max(1, groupCount),
  important: n.important,
  data: (n.data as Record<string, unknown> | null) ?? null,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export async function unreadCounts(userId: string): Promise<{ count: number; byCategory: Partial<Record<NotificationCategory, number>> }> {
  const rows = await prisma.notification.groupBy({ by: ['category'], where: { userId, readAt: null }, _count: { _all: true } });
  const byCategory: Partial<Record<NotificationCategory, number>> = {};
  let count = 0;
  for (const r of rows) {
    byCategory[r.category] = r._count._all;
    count += r._count._all;
  }
  return { count, byCategory };
}

export async function getNotificationDto(userId: string, id: string): Promise<NotificationDto | null> {
  const n = await prisma.notification.findFirst({ where: { id, userId } });
  if (!n) return null;
  const groupCount = n.groupKey ? await prisma.notification.count({ where: { userId, groupKey: n.groupKey, readAt: null } }) : 1;
  return toNotificationDto(n, groupCount);
}

/** Collapsed list: latest row per groupKey, groupCount = unread rows in that group. */
export async function listNotifications(userId: string, q: { cursor?: string; limit: number; category?: NotificationCategory; unreadOnly?: boolean }) {
  const filters: Prisma.Sql[] = [Prisma.sql`"userId" = ${userId}`];
  if (q.category) filters.push(Prisma.sql`category = ${q.category}::"NotificationCategory"`);
  if (q.unreadOnly) filters.push(Prisma.sql`"readAt" IS NULL`);
  const cursor = q.cursor
    ? Prisma.sql`WHERE ("createdAt", id) < (SELECT "createdAt", id FROM "Notification" WHERE id = ${q.cursor} AND "userId" = ${userId})`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<(Notification & { unread: bigint })[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (COALESCE("groupKey", id)) n.*,
        (SELECT COUNT(*) FROM "Notification" g WHERE g."userId" = n."userId" AND g."groupKey" IS NOT NULL AND g."groupKey" = n."groupKey" AND g."readAt" IS NULL) AS unread
      FROM "Notification" n
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY COALESCE("groupKey", id), "createdAt" DESC, id DESC
    ) latest
    ${cursor}
    ORDER BY "createdAt" DESC, id DESC
    LIMIT ${q.limit + 1}`;
  const hasMore = rows.length > q.limit;
  const items = (hasMore ? rows.slice(0, q.limit) : rows).map((r) => toNotificationDto(r, Number(r.unread)));
  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}
