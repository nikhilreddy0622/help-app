import { Prisma } from '@prisma/client';
import type { JobCard, JobDetail, MyJobPosting } from '@help/types';
import type { JobPostingInput, JobSearchInput } from '@help/validation';
import { prisma } from '../../lib/core';
import { notFound } from '../../lib/http';
import { requireOwnProvider } from '../providers/service';

// Falls back to the provider's own coordinates when a job didn't set its own (most postings are "at the shop/base").
const JOB_LAT = Prisma.sql`coalesce(j.lat, p.lat)`;
const JOB_LNG = Prisma.sql`coalesce(j.lng, p.lng)`;
const haversineKm = (lat: number, lng: number) =>
  Prisma.sql`(6371.0 * 2 * asin(sqrt(least(1.0, power(sin(radians(${JOB_LAT} - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(${JOB_LAT})) * power(sin(radians(${JOB_LNG} - ${lng}) / 2), 2)))))`;

type Row = {
  id: string; title: string; jobType: string; categoryId: string | null; payMinPaise: number | null; payMaxPaise: number | null; payUnit: string | null;
  city: string | null; locality: string | null; lat: number | null; lng: number | null; openings: number; createdAt: Date; description: string; status: string; closesAt: Date | null; updatedAt: Date;
  providerId: string; providerName: string; providerAvatarUrl: string | null; categoryName: string | null; dist_km: number | null;
};

function toCard(r: Row): JobCard {
  return {
    id: r.id, title: r.title, jobType: r.jobType as JobCard['jobType'], categoryName: r.categoryName,
    payMinPaise: r.payMinPaise, payMaxPaise: r.payMaxPaise, payUnit: r.payUnit, city: r.city, locality: r.locality,
    distanceKm: r.dist_km == null ? null : Math.round(r.dist_km * 10) / 10, openings: r.openings, createdAt: r.createdAt.toISOString(),
    providerId: r.providerId, providerName: r.providerName, providerAvatarUrl: r.providerAvatarUrl,
  };
}
function toDetail(r: Row): JobDetail { return { ...toCard(r), description: r.description, status: r.status as JobDetail['status'], closesAt: r.closesAt?.toISOString() ?? null }; }
function toMine(r: Row): MyJobPosting { return { ...toDetail(r), updatedAt: r.updatedAt.toISOString() }; }

export async function searchJobs(q: JobSearchInput & { lat: number; lng: number }) {
  const where = [
    Prisma.sql`j."status" = 'OPEN'`, Prisma.sql`j."deletedAt" IS NULL`,
    Prisma.sql`${JOB_LAT} IS NOT NULL AND ${JOB_LNG} IS NOT NULL`,
    Prisma.sql`${haversineKm(q.lat, q.lng)} <= ${q.radiusKm}`,
    q.categoryId ? Prisma.sql`j."categoryId" = ${q.categoryId}` : Prisma.sql`TRUE`,
    q.jobType ? Prisma.sql`j."jobType" = ${q.jobType}` : Prisma.sql`TRUE`,
    q.city ? Prisma.sql`j."city" ILIKE ${`%${q.city}%`}` : Prisma.sql`TRUE`,
    q.q ? Prisma.sql`(j."title" ILIKE ${`%${q.q}%`} OR j."description" ILIKE ${`%${q.q}%`})` : Prisma.sql`TRUE`,
  ];
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT j.id, j.title, j."jobType", j."categoryId", j."payMinPaise", j."payMaxPaise", j."payUnit",
      j.city, j.locality, j.openings, j."createdAt", j.description, j.status, j."closesAt", j."updatedAt",
      p.id AS "providerId", p."displayName" AS "providerName", p."avatarUrl" AS "providerAvatarUrl",
      c.name AS "categoryName", ${JOB_LAT} AS lat, ${JOB_LNG} AS lng,
      ${haversineKm(q.lat, q.lng)} AS dist_km
    FROM "JobPosting" j
    JOIN "ProviderProfile" p ON p.id = j."providerId" AND p."deletedAt" IS NULL
    LEFT JOIN "Category" c ON c.id = j."categoryId"
    WHERE ${Prisma.join(where, ' AND ')}
    ORDER BY j."createdAt" DESC
    LIMIT 200`;
  const limit = q.limit ?? 20;
  const start = q.cursor ? rows.findIndex((r) => r.id === q.cursor) + 1 : 0;
  const slice = rows.slice(start, start + limit);
  return { items: slice.map(toCard), nextCursor: rows.length > start + limit ? slice[slice.length - 1]!.id : null };
}

export async function getJob(id: string): Promise<JobDetail> {
  const j = await prisma.jobPosting.findFirst({
    where: { id, deletedAt: null },
    include: { provider: { select: { id: true, displayName: true, avatarUrl: true } }, category: { select: { name: true } } },
  });
  if (!j) throw notFound('Job posting');
  return toDetail({
    ...j, providerId: j.provider.id, providerName: j.provider.displayName, providerAvatarUrl: j.provider.avatarUrl,
    categoryName: j.category?.name ?? null, dist_km: null,
  } as unknown as Row);
}

export async function myJobs(userId: string): Promise<MyJobPosting[]> {
  const provider = await requireOwnProvider(userId);
  const rows = await prisma.jobPosting.findMany({
    where: { providerId: provider.id, deletedAt: null },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((j) => toMine({
    ...j, providerId: provider.id, providerName: provider.displayName, providerAvatarUrl: provider.avatarUrl,
    categoryName: j.category?.name ?? null, dist_km: null,
  } as unknown as Row));
}

export async function createJob(userId: string, input: JobPostingInput): Promise<MyJobPosting> {
  const provider = await requireOwnProvider(userId);
  const j = await prisma.jobPosting.create({ data: { ...input, providerId: provider.id }, include: { category: { select: { name: true } } } });
  return toMine({ ...j, providerId: provider.id, providerName: provider.displayName, providerAvatarUrl: provider.avatarUrl, categoryName: j.category?.name ?? null, dist_km: null } as unknown as Row);
}

async function ownJobOrThrow(userId: string, jobId: string) {
  const provider = await requireOwnProvider(userId);
  const job = await prisma.jobPosting.findFirst({ where: { id: jobId, providerId: provider.id, deletedAt: null } });
  if (!job) throw notFound('Job posting');
  return { provider, job };
}

export async function updateJob(userId: string, jobId: string, input: Partial<JobPostingInput>): Promise<MyJobPosting> {
  const { provider } = await ownJobOrThrow(userId, jobId);
  const j = await prisma.jobPosting.update({ where: { id: jobId }, data: input, include: { category: { select: { name: true } } } });
  return toMine({ ...j, providerId: provider.id, providerName: provider.displayName, providerAvatarUrl: provider.avatarUrl, categoryName: j.category?.name ?? null, dist_km: null } as unknown as Row);
}

export async function setJobStatus(userId: string, jobId: string, status: 'OPEN' | 'PAUSED' | 'CLOSED'): Promise<MyJobPosting> {
  const { provider } = await ownJobOrThrow(userId, jobId);
  const j = await prisma.jobPosting.update({ where: { id: jobId }, data: { status }, include: { category: { select: { name: true } } } });
  return toMine({ ...j, providerId: provider.id, providerName: provider.displayName, providerAvatarUrl: provider.avatarUrl, categoryName: j.category?.name ?? null, dist_km: null } as unknown as Row);
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  await ownJobOrThrow(userId, jobId);
  await prisma.jobPosting.update({ where: { id: jobId }, data: { deletedAt: new Date(), status: 'CLOSED' } });
}
