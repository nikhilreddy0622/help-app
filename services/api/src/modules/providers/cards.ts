import { effectivePresence, type Presence } from '@help/domain';
import type { ProviderCard, ReviewDto, ServiceOffering } from '@help/types';
import type { Prisma, Review } from '@prisma/client';
import { prisma } from '../../lib/core';

/** Includes needed to build a public card. */
export const cardInclude = {
  primaryCategory: { select: { name: true } },
  services: { where: { isActive: true }, orderBy: [{ pricePaise: 'asc' }, { createdAt: 'asc' }] },
  availability: true,
  exceptions: { where: { endsAt: { gt: new Date(0) } } },
} satisfies Prisma.ProviderProfileInclude;

export type CardRow = Prisma.ProviderProfileGetPayload<{ include: typeof cardInclude }>;

/** Active exceptions only (not yet ended); evaluated at call time to avoid stale module-level dates. */
export const freshCardInclude = (now = new Date()) => ({ ...cardInclude, exceptions: { where: { endsAt: { gt: now } } } }) satisfies Prisma.ProviderProfileInclude;

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Effective presence via the domain rule (auto-return, working hours, pause). Working hours are optional. */
export function presenceOf(p: Pick<CardRow, 'presenceStatus' | 'statusMessage' | 'statusUntil' | 'statusUpdatedAt' | 'isPaused' | 'timezone' | 'availability' | 'exceptions'>, now = new Date()): Presence {
  return effectivePresence(
    {
      status: p.presenceStatus,
      statusMessage: p.statusMessage,
      statusUntil: p.statusUntil,
      statusUpdatedAt: p.statusUpdatedAt,
      isPaused: p.isPaused,
      timezone: p.timezone,
      rules: p.availability.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
      exceptions: p.exceptions,
    },
    now,
  );
}

export function isNewProvider(p: { ratingCount: number; publishedAt: Date | null }, now = new Date()): boolean {
  return p.ratingCount === 0 && !!p.publishedAt && now.getTime() - p.publishedAt.getTime() < 30 * 86_400_000;
}

/** Public card: never includes phone, email, lat/lng. */
export function toCard(p: CardRow, opts: { distanceKm?: number | null; sponsored?: boolean; now?: Date } = {}): ProviderCard {
  const now = opts.now ?? new Date();
  const pr = presenceOf(p, now);
  const cheapest = p.services[0];
  return {
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    headline: p.headline ?? '',
    avatarUrl: p.avatarUrl,
    categoryName: p.primaryCategory?.name ?? '',
    experienceYears: p.experienceYears,
    ratingAvg: p.ratingAvg != null ? round1(p.ratingAvg) : null,
    ratingCount: p.ratingCount,
    distanceKm: opts.distanceKm != null ? round1(opts.distanceKm) : null,
    locality: p.locality,
    startingPricePaise: cheapest?.pricePaise ?? null,
    startingPriceUnit: cheapest?.priceUnit ?? null,
    status: pr.status,
    statusLabel: pr.label,
    statusMessage: pr.message,
    statusUntil: pr.until?.toISOString() ?? null,
    statusUpdatedAt: p.statusUpdatedAt?.toISOString() ?? null,
    statusFresh: pr.fresh,
    availableNow: pr.availableNow,
    badges: { mobile: p.mobileVerified, identity: p.identityVerified, qualification: p.qualificationVerified },
    sponsored: opts.sponsored ?? false,
    isNew: isNewProvider(p, now),
  };
}

export const serviceDto = (s: { id: string; title: string; description: string | null; priceUnit: string; pricePaise: number; negotiable: boolean; durationMinutes: number | null }): ServiceOffering => ({
  id: s.id, title: s.title, description: s.description, priceUnit: s.priceUnit, pricePaise: s.pricePaise, negotiable: s.negotiable, durationMinutes: s.durationMinutes,
});

/** "Rahul Sharma" -> "Rahul S." */
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export const reviewDto = (r: Review & { author: { name: string | null } }): ReviewDto => ({
  id: r.id,
  authorName: shortName(r.author.name),
  overall: r.overall,
  quality: r.quality,
  behaviour: r.behaviour,
  punctuality: r.punctuality,
  value: r.value,
  communication: r.communication,
  comment: r.comment,
  reply: r.reply,
  createdAt: r.createdAt.toISOString(),
  verified: true,
});

/** Batch-upsert search impressions into ProviderDailyStat (fire-and-forget safe). */
export async function recordImpressions(providerIds: string[]): Promise<void> {
  if (!providerIds.length) return;
  await prisma.$executeRaw`
    INSERT INTO "ProviderDailyStat" ("providerId", "day", "views", "impressions")
    SELECT x, CURRENT_DATE, 0, 1 FROM unnest(${providerIds}::text[]) AS x
    ON CONFLICT ("providerId", "day") DO UPDATE SET "impressions" = "ProviderDailyStat"."impressions" + 1`;
}

export async function recordView(providerId: string, userId?: string): Promise<void> {
  if (userId) {
    await prisma.providerView.upsert({ where: { userId_providerId: { userId, providerId } }, create: { userId, providerId }, update: { viewedAt: new Date() } });
  }
  await prisma.$executeRaw`
    INSERT INTO "ProviderDailyStat" ("providerId", "day", "views", "impressions")
    VALUES (${providerId}, CURRENT_DATE, 1, 0)
    ON CONFLICT ("providerId", "day") DO UPDATE SET "views" = "ProviderDailyStat"."views" + 1`;
}
