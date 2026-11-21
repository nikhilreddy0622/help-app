import { rankScore } from '@help/domain';
import type { Category, ProviderCard } from '@help/types';
import type { DiscoverySearchInput } from '@help/validation';
import { Prisma } from '@prisma/client';
import { logger, prisma } from '../../lib/core';
import { presenceOf, freshCardInclude, recordImpressions, toCard, type CardRow } from '../providers/cards';

const CANDIDATE_LIMIT = 300;

interface Candidate { id: string; dist_km: number; rel: number; sponsored: boolean }

const haversine = (lat: number, lng: number) =>
  Prisma.sql`(6371.0 * 2 * asin(sqrt(least(1.0, power(sin(radians(p.lat - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(p.lat)) * power(sin(radians(p.lng - ${lng}) / 2), 2)))))`;

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** PostGIS radius search + filters + text match. Returns candidate ids with distance and a 0..1 relevance. */
let postgis: boolean | undefined;
/** PostGIS is required in production (Neon); the haversine fallback only keeps local DBs without PostGIS usable. */
async function hasPostgis(): Promise<boolean> {
  postgis ??= (await prisma.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_extension WHERE extname = 'postgis'`).length > 0;
  return postgis;
}

async function candidates(q: DiscoverySearchInput, extraWhere: Prisma.Sql[] = []): Promise<Candidate[]> {
  const gis = await hasPostgis();
  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`;
  const radius = gis
    ? Prisma.sql`ST_DWithin(ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography, ${point}, ${q.radiusKm * 1000})`
    : Prisma.sql`${haversine(q.lat, q.lng)} <= ${q.radiusKm}`;
  const dist = gis
    ? Prisma.sql`ST_Distance(ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography, ${point}) / 1000.0`
    : haversine(q.lat, q.lng);
  const where: Prisma.Sql[] = [
    Prisma.sql`p."isDiscoverable" = true`,
    Prisma.sql`p."deletedAt" IS NULL`,
    Prisma.sql`p."isPaused" = false`,
    Prisma.sql`p.lat IS NOT NULL AND p.lng IS NOT NULL`,
    radius,
    ...extraWhere,
  ];
  let rel = Prisma.sql`0.5::float8`;
  if (q.q) {
    const like = `%${likeEscape(q.q)}%`;
    const match = Prisma.sql`(p."displayName" ILIKE ${like} OR p.headline ILIKE ${like} OR c.name ILIKE ${like}
      OR EXISTS (SELECT 1 FROM unnest(c.keywords) k WHERE k ILIKE ${like})
      OR EXISTS (SELECT 1 FROM "Category" pc WHERE pc.id = c."parentId" AND pc.name ILIKE ${like})
      OR EXISTS (SELECT 1 FROM "ProviderSkill" ps JOIN "Skill" s ON s.id = ps."skillId" WHERE ps."providerId" = p.id AND s.name ILIKE ${like})
      OR similarity(p."displayName", ${q.q}) > 0.3 OR similarity(COALESCE(p.headline, ''), ${q.q}) > 0.3 OR similarity(COALESCE(c.name, ''), ${q.q}) > 0.3)`;
    where.push(match);
    rel = Prisma.sql`LEAST(1.0, GREATEST(similarity(p."displayName", ${q.q}), similarity(COALESCE(p.headline, ''), ${q.q}), similarity(COALESCE(c.name, ''), ${q.q}),
      CASE WHEN p."displayName" ILIKE ${like} OR c.name ILIKE ${like} THEN 0.85 WHEN p.headline ILIKE ${like} THEN 0.7 ELSE 0.5 END))::float8`;
  }
  if (q.categoryId) where.push(Prisma.sql`(p."primaryCategoryId" = ${q.categoryId} OR c."parentId" = ${q.categoryId})`);
  if (q.minRating != null) where.push(Prisma.sql`p."ratingAvg" >= ${q.minRating}`);
  if (q.minExperience != null) where.push(Prisma.sql`p."experienceYears" >= ${q.minExperience}`);
  if (q.maxPricePaise != null) where.push(Prisma.sql`EXISTS (SELECT 1 FROM "ServiceOffering" so WHERE so."providerId" = p.id AND so."isActive" AND so."pricePaise" <= ${q.maxPricePaise})`);
  if (q.verifiedOnly) where.push(Prisma.sql`(p."identityVerified" OR p."qualificationVerified")`);
  if (q.language) where.push(Prisma.sql`EXISTS (SELECT 1 FROM unnest(p.languages) l WHERE lower(l) = lower(${q.language}))`);
  if (q.serviceMode) where.push(Prisma.sql`(p."serviceMode" = ${q.serviceMode}::"ServiceMode" OR p."serviceMode" = 'BOTH')`);

  return prisma.$queryRaw<Candidate[]>`
    SELECT p.id,
      ${dist} AS dist_km,
      ${rel} AS rel,
      (p."sponsoredUntil" IS NOT NULL AND p."sponsoredUntil" > now()) AS sponsored
    FROM "ProviderProfile" p
    LEFT JOIN "Category" c ON c.id = p."primaryCategoryId"
    WHERE ${Prisma.join(where, ' AND ')}
    ORDER BY dist_km ASC
    LIMIT ${CANDIDATE_LIMIT}`;
}

const encodeCursor = (offset: number) => Buffer.from(String(offset)).toString('base64url');
const decodeCursor = (c?: string) => {
  const n = c ? Number(Buffer.from(c, 'base64url').toString()) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export async function searchProviders(q: DiscoverySearchInput, userId?: string): Promise<{ items: ProviderCard[]; nextCursor: string | null }> {
  const now = new Date();
  const cands = await candidates(q);
  const rows = await prisma.providerProfile.findMany({ where: { id: { in: cands.map((c) => c.id) } }, include: freshCardInclude(now) });
  const byId = new Map<string, CardRow>(rows.map((r) => [r.id, r]));

  const scored = cands
    .map((c) => {
      const p = byId.get(c.id);
      if (!p) return null;
      const av = presenceOf(p, now);
      return { c, p, av, score: 0 };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .filter((x) => !q.availableNow || x.av.availableNow);
  for (const x of scored) {
    x.score = rankScore({
      relevance: x.c.rel,
      distanceKm: x.c.dist_km,
      radiusKm: q.radiusKm,
      ratingAvg: x.p.ratingAvg,
      ratingCount: x.p.ratingCount,
      availableNow: x.av.availableNow,
      statusFresh: x.av.fresh,
      completeness: x.p.completeness,
      verificationLevel: x.p.verificationLevel,
      responseMinutes: x.p.responseMinutes,
    });
  }
  const minPrice = (x: (typeof scored)[number]) => x.p.services[0]?.pricePaise ?? Number.MAX_SAFE_INTEGER;
  scored.sort((a, b) => {
    switch (q.sort) {
      case 'distance': return a.c.dist_km - b.c.dist_km;
      case 'rating': return (b.p.ratingAvg ?? 0) - (a.p.ratingAvg ?? 0) || b.p.ratingCount - a.p.ratingCount;
      case 'price': return minPrice(a) - minPrice(b);
      default: return b.score - a.score;
    }
  });

  // One sponsored slot on the first page: best-ranked sponsored provider, flagged; excluded from the organic pool.
  const offset = decodeCursor(q.cursor);
  const sponsoredItem = scored.find((x) => x.c.sponsored);
  const pool = sponsoredItem ? scored.filter((x) => x !== sponsoredItem) : scored;
  const showSponsored = offset === 0 && !!sponsoredItem;
  const slice = pool.slice(offset, offset + (showSponsored ? q.limit - 1 : q.limit));
  const consumed = offset + slice.length;
  const items = [
    ...(showSponsored ? [toCard(sponsoredItem!.p, { distanceKm: sponsoredItem!.c.dist_km, sponsored: true, now })] : []),
    ...slice.map((x) => toCard(x.p, { distanceKm: x.c.dist_km, now })),
  ];

  recordImpressions(items.map((i) => i.id)).catch((e) => logger.warn({ err: e }, 'impressions failed'));
  if (userId && q.q && !q.cursor) saveRecentSearch(userId, q.q).catch((e) => logger.warn({ err: e }, 'recent search failed'));
  return { items, nextCursor: consumed < pool.length ? encodeCursor(consumed) : null };
}

async function saveRecentSearch(userId: string, query: string) {
  const text = query.trim().slice(0, 100);
  await prisma.recentSearch.deleteMany({ where: { userId, query: { equals: text, mode: 'insensitive' } } });
  await prisma.recentSearch.create({ data: { userId, query: text } });
  const old = await prisma.recentSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: 10, select: { id: true } });
  if (old.length) await prisma.recentSearch.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

export async function listCategories(): Promise<Category[]> {
  const [cats, counts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.providerProfile.groupBy({ by: ['primaryCategoryId'], where: { isDiscoverable: true, deletedAt: null, isPaused: false }, _count: { _all: true } }),
  ]);
  const own = new Map(counts.map((c) => [c.primaryCategoryId, c._count._all]));
  const total = new Map<string, number>();
  for (const c of cats) total.set(c.id, (total.get(c.id) ?? 0) + (own.get(c.id) ?? 0));
  for (const c of cats) if (c.parentId) total.set(c.parentId, (total.get(c.parentId) ?? 0) + (own.get(c.id) ?? 0));
  // groups first (by sortOrder), each followed by its subcategories
  const groups = cats.filter((c) => !c.parentId);
  const ordered = groups.flatMap((g) => [g, ...cats.filter((c) => c.parentId === g.id)]);
  const orphans = cats.filter((c) => c.parentId && !groups.some((g) => g.id === c.parentId));
  return [...ordered, ...orphans].map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, parentId: c.parentId, providerCount: total.get(c.id) ?? 0, supportsLiveRequest: c.supportsLiveRequest, subgroup: c.subgroup, keywords: c.keywords }));
}

/** Home feed: categories + availableNow + topRated + recentlyActive near the user. */
export async function homeFeed(lat: number, lng: number) {
  const now = new Date();
  const base: DiscoverySearchInput = { lat, lng, radiusKm: 15, limit: 20, sort: 'relevance' };
  const cands = await candidates(base);
  const rows = await prisma.providerProfile.findMany({ where: { id: { in: cands.map((c) => c.id) } }, include: freshCardInclude(now) });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const all = cands
    .map((c) => ({ c, p: byId.get(c.id)! }))
    .filter((x) => x.p)
    .map((x) => ({ ...x, av: presenceOf(x.p, now) }));
  const card = (x: (typeof all)[number]) => toCard(x.p, { distanceKm: x.c.dist_km, now });
  const availableNow = all.filter((x) => x.av.availableNow).sort((a, b) => a.c.dist_km - b.c.dist_km).slice(0, 10).map(card);
  const topRated = all
    .filter((x) => x.p.ratingCount > 0)
    .sort((a, b) => (b.p.ratingAvg ?? 0) - (a.p.ratingAvg ?? 0) || b.p.ratingCount - a.p.ratingCount)
    .slice(0, 10)
    .map(card);
  const recent = await prisma.providerProfile.findMany({
    where: { id: { in: all.map((x) => x.p.id) } },
    orderBy: { statusUpdatedAt: { sort: 'desc', nulls: 'last' } },
    take: 10,
    select: { id: true },
  });
  const order = new Map(recent.map((r, i) => [r.id, i]));
  const recentlyActive = all.filter((x) => order.has(x.p.id)).sort((a, b) => order.get(a.p.id)! - order.get(b.p.id)!).map(card);
  const items = [...availableNow, ...topRated, ...recentlyActive].map((i) => i.id);
  recordImpressions([...new Set(items)]).catch(() => undefined);
  return { categories: await listCategories(), availableNow, topRated, recentlyActive };
}
