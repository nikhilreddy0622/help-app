import { missingForPublish, profileCompleteness, slugify, type CompletenessInput } from '@help/domain';
import type { ContactSettings, PortfolioItem, ProviderDashboard, ProviderInsights, ProviderPublicProfile } from '@help/types';
import type { SetStatusInput } from '@help/validation';
import type { MyProvider } from '@help/api-client';
import type { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { logger, prisma } from '../../lib/core';
import { AppError, conflict, notFound } from '../../lib/http';
import { currentSubscription, refreshDiscoverability } from './entitlement';
import { subscriptionDto } from '../subscriptions/service';
import { freshCardInclude, haversineKm, presenceOf, reviewDto, serviceDto, toCard } from './cards';

type Tx = Prisma.TransactionClient | typeof prisma;

export async function requireOwnProvider(userId: string) {
  const p = await prisma.providerProfile.findFirst({ where: { userId, deletedAt: null } });
  if (!p) throw new AppError(404, 'NO_PROVIDER_PROFILE', 'Create your provider profile first');
  return p;
}

const portfolioDto = (i: { id: string; kind: string; url: string; title: string | null; description: string | null }): PortfolioItem => ({
  id: i.id, kind: i.kind, url: i.url, title: i.title, description: i.description,
});

function completenessInput(p: {
  avatarUrl: string | null; headline: string | null; bio: string | null; city: string | null; lat: number | null; lng: number | null;
  _skills: number; _services: number; _rules: number; _portfolio: number;
}): CompletenessInput {
  return {
    hasPhoto: !!p.avatarUrl,
    hasHeadline: !!p.headline?.trim(),
    bioLength: p.bio?.trim().length ?? 0,
    skillsCount: p._skills,
    servicesCount: p._services,
    hasLocation: p.lat != null && p.lng != null && !!p.city,
    hasAvailability: p._rules > 0,
    portfolioCount: p._portfolio,
  };
}

/** Recompute completeness + verification level + mobileVerified (from user.phoneVerified). */
export async function recompute(providerId: string, tx: Tx = prisma) {
  const p = await tx.providerProfile.findUniqueOrThrow({
    where: { id: providerId },
    include: {
      user: { select: { phoneVerified: true } },
      _count: { select: { skills: true, availability: true, services: { where: { isActive: true } }, portfolio: { where: { deletedAt: null } } } },
    },
  });
  const input = completenessInput({ ...p, _skills: p._count.skills, _services: p._count.services, _rules: p._count.availability, _portfolio: p._count.portfolio });
  const mobile = p.user.phoneVerified;
  const level = (mobile ? 1 : 0) + (p.identityVerified ? 1 : 0) + (p.qualificationVerified ? 1 : 0);
  await tx.providerProfile.update({ where: { id: providerId }, data: { completeness: profileCompleteness(input), verificationLevel: level, mobileVerified: mobile } });
  return { input, missing: missingForPublish(input) };
}

async function slugTaken(slug: string, providerId: string, tx: Tx): Promise<boolean> {
  const [a, b] = await Promise.all([
    tx.providerProfile.findFirst({ where: { slug, NOT: { id: providerId } }, select: { id: true } }),
    tx.slugHistory.findFirst({ where: { slug, NOT: { providerId } }, select: { id: true } }),
  ]);
  return !!(a || b);
}

const suffix = () => randomInt(0, 36 ** 4).toString(36).padStart(4, '0');

/** name-profession-city; short suffix on collision; old slug kept in SlugHistory. */
export async function ensureSlug(providerId: string, tx: Tx = prisma): Promise<string> {
  const p = await tx.providerProfile.findUniqueOrThrow({ where: { id: providerId }, include: { primaryCategory: { select: { name: true } } } });
  const base = slugify(p.displayName, p.primaryCategory?.name ?? '', p.city ?? '') || 'professional';
  if (p.slug === base || new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-z0-9]{4}$`).test(p.slug)) return p.slug;
  let slug = base;
  for (let i = 0; i < 6 && (await slugTaken(slug, providerId, tx)); i++) slug = `${base.slice(0, 75)}-${suffix()}`;
  if (await slugTaken(slug, providerId, tx)) throw conflict('Could not allocate a unique profile URL, please retry');
  if (p.slug === slug) return slug;
  await tx.slugHistory.deleteMany({ where: { slug, providerId } });
  await tx.slugHistory.upsert({ where: { slug: p.slug }, create: { slug: p.slug, providerId }, update: { providerId } });
  await tx.providerProfile.update({ where: { id: providerId }, data: { slug } });
  return slug;
}

export async function myProviderDto(providerId: string): Promise<MyProvider> {
  const p = await prisma.providerProfile.findUniqueOrThrow({
    where: { id: providerId },
    include: {
      skills: { include: { skill: true } },
      services: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      portfolio: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      verifications: { orderBy: { createdAt: 'desc' } },
      user: { select: { phoneVerified: true } },
      _count: { select: { availability: true } },
    },
  });
  const { missing } = await recompute(p.id);
  const input = completenessInput({ ...p, _skills: p.skills.length, _services: p.services.length, _rules: p._count.availability, _portfolio: p.portfolio.length });
  const vstate = (type: 'IDENTITY' | 'QUALIFICATION', verified: boolean): 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' => {
    if (verified) return 'APPROVED';
    return p.verifications.find((v) => v.type === type)?.status ?? 'NONE';
  };
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    isDiscoverable: p.isDiscoverable,
    displayName: p.displayName,
    headline: p.headline,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    coverUrl: p.coverUrl,
    primaryCategoryId: p.primaryCategoryId,
    experienceYears: p.experienceYears,
    languages: p.languages,
    qualifications: p.qualifications,
    skills: p.skills.map((s) => s.skill.name),
    city: p.city,
    pinCode: p.pinCode,
    locality: p.locality,
    lat: p.lat,
    lng: p.lng,
    serviceRadiusKm: p.serviceRadiusKm,
    serviceMode: p.serviceMode,
    areasServed: p.areasServed,
    services: p.services.map(serviceDto),
    portfolio: p.portfolio.map(portfolioDto),
    completeness: Math.round(profileCompleteness(input) * 100) / 100,
    missingForPublish: missing,
    verification: { mobile: p.user.phoneVerified, identity: vstate('IDENTITY', p.identityVerified), qualification: vstate('QUALIFICATION', p.qualificationVerified) },
  };
}

/** Public profile (also used for owner preview). Never includes phone/email/lat/lng. */
export async function publicProfile(where: Prisma.ProviderProfileWhereInput, opts: { from?: { lat: number; lng: number } | null } = {}): Promise<ProviderPublicProfile | null> {
  const now = new Date();
  const p = await prisma.providerProfile.findFirst({
    where,
    include: {
      ...freshCardInclude(now),
      skills: { include: { skill: true } },
      portfolio: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      reviews: { where: { status: 'VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 5, include: { author: { select: { name: true } } } },
    },
  });
  if (!p) return null;
  const distance = opts.from && p.lat != null && p.lng != null ? haversineKm(opts.from, { lat: p.lat, lng: p.lng }) : null;
  return {
    ...toCard(p, { distanceKm: distance, now }),
    bio: p.bio,
    coverUrl: p.coverUrl,
    languages: p.languages,
    qualifications: p.qualifications,
    skills: p.skills.map((s) => s.skill.name),
    serviceRadiusKm: p.serviceRadiusKm,
    serviceMode: p.serviceMode,
    areasServed: p.areasServed,
    services: p.services.map(serviceDto),
    portfolio: p.portfolio.map(portfolioDto),
    workingHours: {
      timezone: p.timezone,
      rules: p.availability.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
    },
    memberSince: p.createdAt.toISOString(),
    phoneAvailable: p.showPhone,
    responseMinutes: p.responseMinutes,
    recentReviews: p.reviews.map(reviewDto),
  };
}

export async function publishProvider(providerId: string) {
  const p = await prisma.providerProfile.findUniqueOrThrow({ where: { id: providerId } });
  if (p.status === 'SUSPENDED' || p.hiddenByAdmin) throw new AppError(403, 'PROFILE_RESTRICTED', 'Your profile has been restricted. Contact support.');
  const { missing } = await recompute(providerId);
  if (missing.length) throw new AppError(422, 'INCOMPLETE_PROFILE', 'Complete your profile before publishing', { missingForPublish: missing });
  await prisma.providerProfile.update({ where: { id: providerId }, data: { status: 'PUBLISHED', publishedAt: p.publishedAt ?? new Date() } });
  await refreshDiscoverability(providerId);
}

export async function unpublishProvider(providerId: string) {
  await prisma.providerProfile.update({ where: { id: providerId }, data: { status: 'HIDDEN' } });
  await refreshDiscoverability(providerId);
}

export async function presenceDto(providerId: string): Promise<ProviderDashboard['presence']> {
  const p = await prisma.providerProfile.findUniqueOrThrow({ where: { id: providerId }, include: freshCardInclude() });
  const pr = presenceOf(p);
  return {
    status: pr.status,
    statusLabel: pr.label,
    statusMessage: pr.message,
    statusUntil: pr.until?.toISOString() ?? null,
    statusUpdatedAt: p.statusUpdatedAt?.toISOString() ?? null,
    isPaused: p.isPaused,
  };
}

export async function setStatus(providerId: string, b: SetStatusInput) {
  const available = b.status === 'AVAILABLE';
  await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      presenceStatus: b.status,
      statusMessage: available ? null : (b.message?.trim() || null),
      statusUntil: available ? null : (b.until ?? null),
      statusUpdatedAt: new Date(),
    },
  });
  return presenceDto(providerId);
}

export async function confirmStatus(providerId: string) {
  await prisma.providerProfile.update({ where: { id: providerId }, data: { statusUpdatedAt: new Date() } });
  return presenceDto(providerId);
}

export async function setVisibility(providerId: string, visible: boolean) {
  await prisma.providerProfile.update({ where: { id: providerId }, data: { isPaused: !visible } });
  await refreshDiscoverability(providerId);
  return presenceDto(providerId);
}

export const contactSettings = (providerId: string): Promise<ContactSettings> =>
  prisma.providerProfile.findUniqueOrThrow({ where: { id: providerId }, select: { showPhone: true, autoReplyEnabled: true, autoReplyText: true } });

/** Response stats over the last 90 days: share of new chats answered within 24h + median minutes to first reply. */
async function responseStats(providerId: string) {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const convos = await prisma.conversation.findMany({ where: { providerId, createdAt: { gte: since } }, select: { createdAt: true, providerFirstReplyAt: true } });
  if (!convos.length) return { responseRate: null as number | null, responseMinutes: null as number | null };
  const mins = convos
    .filter((c) => c.providerFirstReplyAt)
    .map((c) => Math.max(1, Math.round((c.providerFirstReplyAt!.getTime() - c.createdAt.getTime()) / 60_000)))
    .sort((a, b) => a - b);
  const quick = convos.filter((c) => c.providerFirstReplyAt && c.providerFirstReplyAt.getTime() - c.createdAt.getTime() <= 86_400_000).length;
  return { responseRate: Math.round((quick / convos.length) * 100) / 100, responseMinutes: mins.length ? mins[Math.floor(mins.length / 2)]! : null };
}

export async function dashboard(providerId: string): Promise<ProviderDashboard> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const p = await prisma.providerProfile.findUniqueOrThrow({ where: { id: providerId } });
  const [stats, kinds, sub, missing, presence, rs] = await Promise.all([
    prisma.providerDailyStat.aggregate({ where: { providerId, day: { gte: since } }, _sum: { views: true, impressions: true } }),
    prisma.contactEvent.groupBy({ by: ['kind'], where: { providerId, createdAt: { gte: since } }, _count: { _all: true } }),
    currentSubscription(providerId),
    recompute(providerId),
    presenceDto(providerId),
    responseStats(providerId),
  ]);
  const n = (k: string) => kinds.find((x) => x.kind === k)?._count._all ?? 0;
  return {
    profileViews30d: stats._sum.views ?? 0,
    searchImpressions30d: stats._sum.impressions ?? 0,
    chatsStarted30d: n('CHAT_STARTED'),
    phoneReveals30d: n('PHONE_REVEALED'),
    saves30d: n('SAVED'),
    presence,
    ratingAvg: p.ratingAvg != null ? Math.round(p.ratingAvg * 10) / 10 : null,
    ratingCount: p.ratingCount,
    responseRate: rs.responseRate,
    completeness: Math.round(p.completeness * 100) / 100,
    missingForPublish: missing.missing,
    isPublished: p.status === 'PUBLISHED',
    subscription: sub ? subscriptionDto(sub) : null,
  };
}

export async function insights(providerId: string, days: number): Promise<ProviderInsights> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [stats, events, terms, rs] = await Promise.all([
    prisma.providerDailyStat.findMany({ where: { providerId, day: { gte: since } } }),
    prisma.contactEvent.findMany({ where: { providerId, createdAt: { gte: since }, kind: { not: 'PROFILE_VIEW' } }, select: { kind: true, createdAt: true } }),
    prisma.$queryRaw<{ term: string; count: bigint }[]>`
      SELECT lower(rs.query) AS term, count(*) AS count FROM "RecentSearch" rs
      JOIN "ProviderProfile" p ON p.id = ${providerId}
      LEFT JOIN "Category" c ON c.id = p."primaryCategoryId"
      WHERE rs."createdAt" >= ${since}
        AND (p."displayName" ILIKE '%' || rs.query || '%' OR COALESCE(p.headline, '') ILIKE '%' || rs.query || '%' OR COALESCE(c.name, '') ILIKE '%' || rs.query || '%')
      GROUP BY 1 ORDER BY count DESC LIMIT 8`,
    responseStats(providerId),
  ]);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const series: ProviderInsights['series'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = key(new Date(Date.now() - i * 86_400_000));
    const st = stats.find((x) => key(x.day) === day);
    const ev = (k: string) => events.filter((e) => e.kind === k && key(e.createdAt) === day).length;
    series.push({ day, views: st?.views ?? 0, impressions: st?.impressions ?? 0, chats: ev('CHAT_STARTED'), phoneReveals: ev('PHONE_REVEALED'), saves: ev('SAVED') });
  }
  const sum = (f: (r: (typeof series)[number]) => number) => series.reduce((a, r) => a + f(r), 0);
  return {
    days,
    totals: { views: sum((r) => r.views), impressions: sum((r) => r.impressions), chats: sum((r) => r.chats), phoneReveals: sum((r) => r.phoneReveals), saves: sum((r) => r.saves) },
    series,
    responseRate: rs.responseRate,
    responseMinutes: rs.responseMinutes,
    topSearchTerms: terms.map((t) => ({ term: t.term, count: Number(t.count) })),
  };
}

export async function upsertSkills(providerId: string, names: string[]) {
  const unique = [...new Map(names.map((n) => n.trim()).filter(Boolean).map((n) => [n.toLowerCase(), n])).values()];
  await prisma.$transaction(async (tx) => {
    const skills = [] as { id: string }[];
    for (const name of unique) {
      const existing = await tx.skill.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      skills.push(existing ?? (await tx.skill.create({ data: { name } })));
    }
    await tx.providerSkill.deleteMany({ where: { providerId } });
    await tx.providerSkill.createMany({ data: skills.map((s) => ({ providerId, skillId: s.id })), skipDuplicates: true });
  });
}

export async function assertCategory(id: string) {
  const c = await prisma.category.findFirst({ where: { id, isActive: true }, select: { id: true } });
  if (!c) throw notFound('Category');
}

export function safeLog(e: unknown, msg: string) {
  logger.warn({ err: e }, msg);
}
