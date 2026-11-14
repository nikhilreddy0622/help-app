import { Router, type Request } from 'express';
import { categoriesCache } from '../discovery/routes';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { AdminAnalytics, AdminMe, AdminOverview, AdminRow } from '@help/api-client';
import {
  AdminChangePasswordSchema, AdminDecisionSchema, AdminForgotSchema, AdminResetSchema, AdminRole, AdminUserStatusSchema, CategorySchema, PlanSchema, cursorQuery,
} from '@help/validation';
import { Prisma } from '@prisma/client';
import { prisma, randomToken, sha256 } from '../../lib/core';
import { env } from '../../config/env';
import { queueEmail } from '../../integrations/email';
import { adminTicketRoutes } from '../support/admin';
import { AppError, ah, conflict, created, notFound, ok, parse, unauthorized } from '../../lib/http';
import { requireAdmin } from '../../middleware/auth';
import { signAdminAccess } from '../auth/tokens';
import { refreshDiscoverability } from '../providers/entitlement';
import { recompute } from '../providers/service';
import { recalcRating } from '../reviews/routes';
import { reconcileOne } from '../subscriptions/service';

export const adminRouter = Router();

// ---------- helpers ----------
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
const listQuery = cursorQuery.extend({ limit: z.coerce.number().int().min(1).max(100).default(25), q: z.string().trim().max(100).optional(), status: z.string().max(40).optional() });

async function audit(req: Request, action: string, targetType: string, targetId: string | null, before?: unknown, after?: unknown) {
  await prisma.auditLog.create({
    data: {
      adminId: req.admin!.id, action, targetType, targetId,
      before: (before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (after ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: req.ip,
    },
  });
}

/** Cursor-paginate any Prisma delegate list; `map` flattens a row into an AdminRow. */
async function paged<T extends { id: string }>(req: Request, res: import('express').Response, find: (a: { take: number; skip?: number; cursor?: { id: string } }) => Promise<T[]>, map: (r: T) => AdminRow, limit: number, cursor?: string) {
  const rows = await find({ take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  ok(res, items.map(map), { nextCursor: hasMore ? items[items.length - 1]!.id : null });
}

const adminMe = (a: { id: string; email: string; name: string; role: string }): AdminMe => ({ id: a.id, email: a.email, name: a.name, role: a.role as AdminMe['role'] });

// ---------- auth ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.NODE_ENV === 'test' });
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

adminRouter.post('/auth/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }), req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !admin.isActive || !valid) throw unauthorized('Invalid email or password');
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  ok(res, { accessToken: await signAdminAccess(admin.id, admin.role, admin.passwordChangedAt?.getTime() ?? 0), admin: adminMe(admin) });
}));

const forgotLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.NODE_ENV === 'test' });

/** Always answers ok (no account enumeration). Emails a single-use link valid for 30 minutes. */
adminRouter.post('/auth/forgot', forgotLimiter, ah(async (req, res) => {
  const { email } = parse(AdminForgotSchema, req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin?.isActive) {
    const token = randomToken(32);
    await prisma.adminPasswordReset.create({ data: { adminId: admin.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    const resetUrl = `${env.ADMIN_WEB_URL}/reset-password?token=${token}`;
    await queueEmail({ to: admin.email, template: 'admin-password-reset', dedupeKey: `admin-reset:${sha256(token)}`, vars: { name: admin.name, resetUrl } }).catch(() => undefined);
    await prisma.auditLog.create({ data: { adminId: admin.id, action: 'ADMIN_PASSWORD_RESET_REQUESTED', targetType: 'AdminUser', targetId: admin.id, ip: req.ip } });
  }
  ok(res, { ok: true });
}));

adminRouter.post('/auth/reset', forgotLimiter, ah(async (req, res) => {
  const { token, password } = parse(AdminResetSchema, req.body);
  const hash = sha256(token);
  const row = await prisma.adminPasswordReset.findUnique({ where: { tokenHash: hash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError(400, 'RESET_TOKEN_INVALID', 'This reset link is invalid or has expired');
  // Atomic single use.
  const { count } = await prisma.adminPasswordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!count) throw new AppError(400, 'RESET_TOKEN_INVALID', 'This reset link is invalid or has expired');
  await prisma.adminUser.update({ where: { id: row.adminId }, data: { passwordHash: await bcrypt.hash(password, 10), passwordChangedAt: new Date() } });
  await prisma.adminPasswordReset.updateMany({ where: { adminId: row.adminId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.auditLog.create({ data: { adminId: row.adminId, action: 'ADMIN_PASSWORD_RESET', targetType: 'AdminUser', targetId: row.adminId, ip: req.ip } });
  ok(res, { ok: true });
}));

adminRouter.post('/auth/change-password', requireAdmin(), ah(async (req, res) => {
  const { currentPassword, newPassword } = parse(AdminChangePasswordSchema, req.body);
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: req.admin!.id } });
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) throw new AppError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date() } });
  await audit(req, 'ADMIN_PASSWORD_CHANGE', 'AdminUser', admin.id);
  ok(res, { ok: true });
}));

adminRouter.get('/auth/me', requireAdmin(), ah(async (req, res) => {
  ok(res, adminMe(await prisma.adminUser.findUniqueOrThrow({ where: { id: req.admin!.id } })));
}));

// ---------- overview / analytics ----------
adminRouter.get('/overview', requireAdmin(), ah(async (_req, res) => {
  const d30 = new Date(Date.now() - 30 * 86_400_000);
  const d7 = new Date(Date.now() - 7 * 86_400_000);
  const [users, providers, published, activeSubs, chats30d, paused, openReports, pendingVerifications, failed, plans] = await Promise.all([
    prisma.user.count({ where: { status: { not: 'DELETED' } } }),
    prisma.providerProfile.count({ where: { deletedAt: null } }),
    prisma.providerProfile.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.conversation.count({ where: { createdAt: { gte: d30 } } }),
    prisma.providerProfile.count({ where: { isPaused: true, deletedAt: null } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
    prisma.verification.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: d7 } } }),
    prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { plan: { select: { pricePaise: true, interval: true } } } }),
  ]);
  const mrrPaise = Math.round(plans.reduce((a, s) => a + (s.plan.interval === 'YEARLY' ? s.plan.pricePaise / 12 : s.plan.pricePaise), 0));
  const out: AdminOverview = { users, providers, publishedProviders: published, activeSubscriptions: activeSubs, mrrPaise, chats30d, pausedProviders: paused, openReports, pendingVerifications, failedPayments7d: failed };
  ok(res, out);
}));

adminRouter.get('/analytics', requireAdmin(), ah(async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
  const since = new Date(Date.now() - days * 86_400_000);
  const [signups, chats, reveals, revenue, views, searches, contactsN, replied, reviewsN, top] = await Promise.all([
    prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") d, count(*) n FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") d, count(*) n FROM "ContactEvent" WHERE kind = 'CHAT_STARTED' AND "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") d, count(*) n FROM "ContactEvent" WHERE kind = 'PHONE_REVEALED' AND "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "paidAt") d, COALESCE(sum("amountPaise"),0) n FROM "Payment" WHERE status = 'CAPTURED' AND "paidAt" >= ${since} GROUP BY 1`,
    prisma.providerDailyStat.aggregate({ where: { day: { gte: since } }, _sum: { views: true } }),
    prisma.recentSearch.count({ where: { createdAt: { gte: since } } }),
    prisma.contactEvent.count({ where: { createdAt: { gte: since }, kind: { in: ['CHAT_STARTED', 'PHONE_REVEALED'] } } }),
    prisma.conversation.count({ where: { createdAt: { gte: since }, providerFirstReplyAt: { not: null } } }),
    prisma.review.count({ where: { createdAt: { gte: since } } }),
    prisma.$queryRaw<{ name: string; providers: bigint; contacts: bigint }[]>`
      SELECT c.name,
        (SELECT count(*) FROM "ProviderProfile" p WHERE p."primaryCategoryId" = c.id AND p."isDiscoverable") AS providers,
        (SELECT count(*) FROM "ContactEvent" e JOIN "ProviderProfile" p ON p.id = e."providerId"
          WHERE p."primaryCategoryId" = c.id AND e."createdAt" >= ${since} AND e.kind IN ('CHAT_STARTED', 'PHONE_REVEALED')) AS contacts
      FROM "Category" c WHERE c."isActive" ORDER BY contacts DESC, providers DESC LIMIT 10`,
  ]);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const idx = (rows: { d: Date; n: bigint }[]) => new Map(rows.map((r) => [key(r.d), Number(r.n)]));
  const [s, c, v, r] = [idx(signups), idx(chats), idx(reveals), idx(revenue)];
  const series: AdminAnalytics['series'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = key(new Date(Date.now() - i * 86_400_000));
    series.push({ day, signups: s.get(day) ?? 0, chats: c.get(day) ?? 0, phoneReveals: v.get(day) ?? 0, revenuePaise: r.get(day) ?? 0 });
  }
  const out: AdminAnalytics = {
    series,
    funnel: { searches, profileViews: views._sum.views ?? 0, contacts: contactsN, chatsReplied: replied, reviews: reviewsN },
    topCategories: top.map((t) => ({ name: t.name, providers: Number(t.providers), contacts: Number(t.contacts) })),
  };
  ok(res, out);
}));

// ---------- users ----------
adminRouter.get('/users', requireAdmin('SUPPORT', 'OPERATIONS'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.UserWhereInput = {
    ...(q.status ? { status: q.status as 'ACTIVE' } : {}),
    ...(q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }] } : {}),
  };
  await paged(req, res, (a) => prisma.user.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { provider: { select: { id: true } } }, ...a }),
    (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, phoneVerified: u.phoneVerified, status: u.status, city: u.city, hasProvider: !!u.provider, providerId: u.provider?.id ?? null, createdAt: iso(u.createdAt) }),
    q.limit, q.cursor);
}));

adminRouter.post('/users/:id/status', requireAdmin('SUPPORT', 'OPERATIONS'), ah(async (req, res) => {
  const b = parse(AdminUserStatusSchema, req.body);
  const u = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!u || u.status === 'DELETED') throw notFound('User');
  const upd = await prisma.user.update({ where: { id: u.id }, data: { status: b.status } });
  if (b.status === 'SUSPENDED') {
    await prisma.session.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
    const p = await prisma.providerProfile.findUnique({ where: { userId: u.id }, select: { id: true } });
    if (p) await prisma.providerProfile.update({ where: { id: p.id }, data: { isDiscoverable: false } });
  } else {
    const p = await prisma.providerProfile.findUnique({ where: { userId: u.id }, select: { id: true } });
    if (p) await refreshDiscoverability(p.id);
  }
  await audit(req, 'USER_STATUS', 'User', u.id, { status: u.status }, { status: b.status, reason: b.reason });
  ok(res, { id: upd.id, name: upd.name, email: upd.email, status: upd.status });
}));

// ---------- providers ----------
const providerRow = (p: Prisma.ProviderProfileGetPayload<{ include: { user: { select: { email: true; phone: true } }; primaryCategory: { select: { name: true } } } }>): AdminRow => ({
  id: p.id, displayName: p.displayName, slug: p.slug, status: p.status, isDiscoverable: p.isDiscoverable, hiddenByAdmin: p.hiddenByAdmin,
  presence: p.presenceStatus, statusMessage: p.statusMessage, statusUntil: iso(p.statusUntil), statusUpdatedAt: iso(p.statusUpdatedAt), isPaused: p.isPaused,
  category: p.primaryCategory?.name ?? null, city: p.city, email: p.user.email, phone: p.user.phone, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
  completeness: p.completeness, verificationLevel: p.verificationLevel, identityVerified: p.identityVerified, qualificationVerified: p.qualificationVerified,
  sponsoredUntil: iso(p.sponsoredUntil), createdAt: iso(p.createdAt),
});
const providerAdminInclude = { user: { select: { email: true, phone: true } }, primaryCategory: { select: { name: true } } } as const;

adminRouter.get('/providers', requireAdmin('OPERATIONS', 'SUPPORT', 'MODERATOR'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.ProviderProfileWhereInput = {
    ...(q.status ? { status: q.status as 'DRAFT' } : {}),
    ...(q.q ? { OR: [{ displayName: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }] } : {}),
  };
  await paged(req, res, (a) => prisma.providerProfile.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: providerAdminInclude, ...a }), providerRow, q.limit, q.cursor);
}));

adminRouter.get('/providers/:id', requireAdmin('OPERATIONS', 'SUPPORT', 'MODERATOR'), ah(async (req, res) => {
  const p = await prisma.providerProfile.findUnique({ where: { id: String(req.params.id) }, include: providerAdminInclude });
  if (!p) throw notFound('Provider');
  const [subs, verifs] = await Promise.all([
    prisma.subscription.findFirst({ where: { providerId: p.id }, orderBy: { createdAt: 'desc' }, include: { plan: true } }),
    prisma.verification.count({ where: { providerId: p.id, status: 'PENDING' } }),
  ]);
  ok(res, { ...providerRow(p), headline: p.headline, bio: p.bio, subscriptionStatus: subs?.status ?? null, planCode: subs?.plan.code ?? null, pendingVerifications: verifs });
}));

adminRouter.post('/providers/:id/visibility', requireAdmin('OPERATIONS', 'MODERATOR'), ah(async (req, res) => {
  const b = parse(z.object({ hidden: z.boolean(), reason: z.string().max(500).optional() }), req.body);
  const p = await prisma.providerProfile.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound('Provider');
  const status = b.hidden ? 'HIDDEN' : p.publishedAt ? 'PUBLISHED' : 'DRAFT';
  await prisma.providerProfile.update({ where: { id: p.id }, data: { hiddenByAdmin: b.hidden, status: p.status === 'SUSPENDED' ? p.status : status } });
  await refreshDiscoverability(p.id);
  await audit(req, b.hidden ? 'PROVIDER_HIDE' : 'PROVIDER_UNHIDE', 'ProviderProfile', p.id, { status: p.status }, { hidden: b.hidden, reason: b.reason });
  ok(res, providerRow(await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.id }, include: providerAdminInclude })));
}));

adminRouter.post('/providers/:id/sponsor', requireAdmin('OPERATIONS'), ah(async (req, res) => {
  const b = parse(z.object({ until: z.string().datetime().nullable() }), req.body);
  const p = await prisma.providerProfile.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound('Provider');
  const until = b.until ? new Date(b.until) : null;
  await prisma.providerProfile.update({ where: { id: p.id }, data: { sponsoredUntil: until } });
  await audit(req, 'PROVIDER_SPONSOR', 'ProviderProfile', p.id, { sponsoredUntil: iso(p.sponsoredUntil) }, { sponsoredUntil: iso(until) });
  ok(res, providerRow(await prisma.providerProfile.findUniqueOrThrow({ where: { id: p.id }, include: providerAdminInclude })));
}));

// ---------- categories ----------
const catRow = (c: { id: string; name: string; slug: string; icon: string | null; parentId: string | null; isActive: boolean; sortOrder: number }) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, parentId: c.parentId, isActive: c.isActive, sortOrder: c.sortOrder });

adminRouter.get('/categories', requireAdmin('OPERATIONS', 'SUPPORT', 'MODERATOR'), ah(async (_req, res) => {
  ok(res, (await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })).map(catRow));
}));
adminRouter.post('/categories', requireAdmin('OPERATIONS'), ah(async (req, res) => {
  const b = parse(CategorySchema, req.body);
  if (await prisma.category.findUnique({ where: { slug: b.slug } })) throw conflict('Slug already used', 'SLUG_TAKEN');
  const c = await prisma.category.create({ data: b });
  categoriesCache.clear();
  await audit(req, 'CATEGORY_CREATE', 'Category', c.id, undefined, b);
  created(res, catRow(c));
}));
adminRouter.patch('/categories/:id', requireAdmin('OPERATIONS'), ah(async (req, res) => {
  const b = parse(CategorySchema.partial(), req.body);
  const before = await prisma.category.findUnique({ where: { id: String(req.params.id) } });
  if (!before) throw notFound('Category');
  const c = await prisma.category.update({ where: { id: before.id }, data: b });
  categoriesCache.clear();
  await audit(req, 'CATEGORY_UPDATE', 'Category', c.id, catRow(before), b);
  ok(res, catRow(c));
}));

// ---------- verifications ----------
const verifRow = (v: Prisma.VerificationGetPayload<{ include: { provider: { select: { displayName: true; slug: true } } } }>): AdminRow => ({
  id: v.id, providerId: v.providerId, providerName: v.provider.displayName, providerSlug: v.provider.slug, type: v.type, status: v.status, label: v.label,
  documentUrl: v.documentUrl, reviewNote: v.reviewNote, reviewedBy: v.reviewedBy, reviewedAt: iso(v.reviewedAt), createdAt: iso(v.createdAt),
});
const verifInclude = { provider: { select: { displayName: true, slug: true } } } as const;

adminRouter.get('/verifications', requireAdmin('OPERATIONS', 'SUPPORT'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.VerificationWhereInput = { status: (q.status as 'PENDING') ?? 'PENDING' };
  await paged(req, res, (a) => prisma.verification.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: verifInclude, ...a }), verifRow, q.limit, q.cursor);
}));

adminRouter.post('/verifications/:id/decision', requireAdmin('OPERATIONS', 'SUPPORT'), ah(async (req, res) => {
  const b = parse(AdminDecisionSchema, req.body);
  const v = await prisma.verification.findUnique({ where: { id: String(req.params.id) } });
  if (!v) throw notFound('Verification');
  if (v.status !== 'PENDING') throw conflict('Already decided', 'ALREADY_DECIDED');
  const status = b.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  await prisma.$transaction(async (tx) => {
    await tx.verification.update({ where: { id: v.id }, data: { status, reviewNote: b.note, reviewedBy: req.admin!.id, reviewedAt: new Date() } });
    if (status === 'APPROVED') {
      if (v.type === 'IDENTITY') await tx.providerProfile.update({ where: { id: v.providerId }, data: { identityVerified: true } });
      if (v.type === 'QUALIFICATION') await tx.providerProfile.update({ where: { id: v.providerId }, data: { qualificationVerified: true } });
    }
    await recompute(v.providerId, tx);
  });
  await audit(req, `VERIFICATION_${status}`, 'Verification', v.id, { status: v.status }, { status, note: b.note });
  const prov = await prisma.providerProfile.findUnique({ where: { id: v.providerId }, select: { userId: true } });
  if (prov) {
    const { notifySafe } = await import('../../integrations/notify');
    await notifySafe(prov.userId, {
      type: `VERIFICATION_${status}`, category: 'ACCOUNT', important: true,
      title: status === 'APPROVED' ? 'Verification approved' : 'Verification rejected',
      body: status === 'APPROVED' ? `Your ${v.type.toLowerCase()} verification was approved.` : `Your ${v.type.toLowerCase()} verification was rejected${b.note ? `: ${b.note}` : '.'}`,
      link: '/provider/verification',
    });
  }
  ok(res, verifRow(await prisma.verification.findUniqueOrThrow({ where: { id: v.id }, include: verifInclude })));
}));

// ---------- plans / subscriptions / payments ----------
const planRow = (p: { id: string; code: string; name: string; interval: 'MONTHLY' | 'YEARLY'; pricePaise: number; features: string[]; isActive: boolean }) => ({
  id: p.id, code: p.code, name: p.name, interval: p.interval, pricePaise: p.pricePaise, features: p.features, isActive: p.isActive,
});
adminRouter.get('/plans', requireAdmin('FINANCE', 'OPERATIONS'), ah(async (_req, res) => ok(res, (await prisma.subscriptionPlan.findMany({ orderBy: { pricePaise: 'asc' } })).map(planRow))));
adminRouter.post('/plans', requireAdmin('FINANCE'), ah(async (req, res) => {
  const b = parse(PlanSchema, req.body);
  if (await prisma.subscriptionPlan.findUnique({ where: { code: b.code } })) throw conflict('Plan code already exists', 'CODE_TAKEN');
  const p = await prisma.subscriptionPlan.create({ data: b });
  await audit(req, 'PLAN_CREATE', 'SubscriptionPlan', p.id, undefined, b);
  created(res, planRow(p));
}));
adminRouter.patch('/plans/:id', requireAdmin('FINANCE'), ah(async (req, res) => {
  const b = parse(PlanSchema.partial(), req.body);
  const before = await prisma.subscriptionPlan.findUnique({ where: { id: String(req.params.id) } });
  if (!before) throw notFound('Plan');
  // A price/interval change must not mutate the Razorpay plan: drop the mapping so a new one is created on next checkout.
  const repriced = (b.pricePaise !== undefined && b.pricePaise !== before.pricePaise) || (b.interval && b.interval !== before.interval);
  const p = await prisma.subscriptionPlan.update({ where: { id: before.id }, data: { ...b, ...(repriced ? { razorpayPlanId: null } : {}) } });
  await audit(req, 'PLAN_UPDATE', 'SubscriptionPlan', p.id, planRow(before), b);
  ok(res, planRow(p));
}));

adminRouter.get('/subscriptions', requireAdmin('FINANCE', 'OPERATIONS', 'SUPPORT'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.SubscriptionWhereInput = q.status ? { status: q.status as 'ACTIVE' } : {};
  await paged(req, res, (a) => prisma.subscription.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { plan: true, provider: { select: { displayName: true } } }, ...a }),
    (s) => ({ id: s.id, providerId: s.providerId, providerName: s.provider.displayName, plan: s.plan.code, status: s.status, razorpaySubscriptionId: s.razorpaySubscriptionId, currentPeriodEnd: iso(s.currentPeriodEnd), pastDueSince: iso(s.pastDueSince), cancelAtPeriodEnd: s.cancelAtPeriodEnd, createdAt: iso(s.createdAt) }),
    q.limit, q.cursor);
}));
adminRouter.post('/subscriptions/:id/reconcile', requireAdmin('FINANCE', 'OPERATIONS'), ah(async (req, res) => {
  const s = await prisma.subscription.findUnique({ where: { id: String(req.params.id) } });
  if (!s) throw notFound('Subscription');
  await reconcileOne(s.id);
  await audit(req, 'SUBSCRIPTION_RECONCILE', 'Subscription', s.id);
  const f = await prisma.subscription.findUniqueOrThrow({ where: { id: s.id }, include: { plan: true } });
  ok(res, { id: f.id, providerId: f.providerId, plan: f.plan.code, status: f.status, currentPeriodEnd: iso(f.currentPeriodEnd) });
}));
adminRouter.get('/payments', requireAdmin('FINANCE'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.PaymentWhereInput = q.status ? { status: q.status as 'CAPTURED' } : {};
  await paged(req, res, (a) => prisma.payment.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { subscription: { select: { providerId: true, provider: { select: { displayName: true } } } } }, ...a }),
    (p) => ({ id: p.id, razorpayPaymentId: p.razorpayPaymentId, providerId: p.subscription.providerId, providerName: p.subscription.provider.displayName, amountPaise: p.amountPaise, status: p.status, method: p.method, failureReason: p.failureReason, paidAt: iso(p.paidAt), createdAt: iso(p.createdAt) }),
    q.limit, q.cursor);
}));

// ---------- reviews ----------
const reviewRow = (r: Prisma.ReviewGetPayload<{ include: { author: { select: { name: true } }; provider: { select: { displayName: true } } } }>): AdminRow => ({
  id: r.id, providerId: r.providerId, providerName: r.provider.displayName, authorName: r.author.name, overall: r.overall, comment: r.comment, reply: r.reply, status: r.status, createdAt: iso(r.createdAt),
});
const reviewAdminInclude = { author: { select: { name: true } }, provider: { select: { displayName: true } } } as const;

adminRouter.get('/reviews', requireAdmin('MODERATOR', 'SUPPORT'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.ReviewWhereInput = q.status ? { status: q.status as 'VISIBLE' } : {};
  await paged(req, res, (a) => prisma.review.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: reviewAdminInclude, ...a }), reviewRow, q.limit, q.cursor);
}));
adminRouter.post('/reviews/:id/moderate', requireAdmin('MODERATOR'), ah(async (req, res) => {
  const b = parse(z.object({ status: z.enum(['VISIBLE', 'HIDDEN', 'REMOVED']), note: z.string().max(500).optional() }), req.body);
  const before = await prisma.review.findUnique({ where: { id: String(req.params.id) } });
  if (!before) throw notFound('Review');
  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: before.id }, data: { status: b.status } });
    await recalcRating(tx, before.providerId);
  });
  await audit(req, 'REVIEW_MODERATE', 'Review', before.id, { status: before.status }, { status: b.status, note: b.note });
  ok(res, reviewRow(await prisma.review.findUniqueOrThrow({ where: { id: before.id }, include: reviewAdminInclude })));
}));

// ---------- reports ----------
const reportRow = (r: Prisma.ReportGetPayload<{ include: { reporter: { select: { name: true; email: true } } } }>): AdminRow => ({
  id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details, status: r.status, resolution: r.resolution,
  reporterId: r.reporterId, reporterName: r.reporter.name, handledBy: r.handledBy, createdAt: iso(r.createdAt),
});
const reportInclude = { reporter: { select: { name: true, email: true } } } as const;

adminRouter.get('/reports', requireAdmin('MODERATOR', 'SUPPORT'), ah(async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.ReportWhereInput = q.status ? { status: q.status as 'OPEN' } : {};
  await paged(req, res, (a) => prisma.report.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: reportInclude, ...a }), reportRow, q.limit, q.cursor);
}));
adminRouter.post('/reports/:id/resolve', requireAdmin('MODERATOR', 'SUPPORT'), ah(async (req, res) => {
  const b = parse(z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), resolution: z.string().max(1000).optional() }), req.body);
  const before = await prisma.report.findUnique({ where: { id: String(req.params.id) } });
  if (!before) throw notFound('Report');
  await prisma.report.update({ where: { id: before.id }, data: { status: b.status, resolution: b.resolution, handledBy: req.admin!.id } });
  await audit(req, 'REPORT_RESOLVE', 'Report', before.id, { status: before.status }, b);
  ok(res, reportRow(await prisma.report.findUniqueOrThrow({ where: { id: before.id }, include: reportInclude })));
}));

// ---------- audit logs / admins (SUPER_ADMIN only) ----------
adminRouter.get('/audit-logs', requireAdmin(), ah(async (req, res) => {
  if (req.admin!.role !== 'SUPER_ADMIN') throw new AppError(403, 'FORBIDDEN', 'Super admin only');
  const q = parse(listQuery.extend({ targetType: z.string().optional(), adminId: z.string().optional() }), req.query);
  const where: Prisma.AuditLogWhereInput = { ...(q.targetType ? { targetType: q.targetType } : {}), ...(q.adminId ? { adminId: q.adminId } : {}), ...(q.q ? { action: { contains: q.q, mode: 'insensitive' } } : {}) };
  await paged(req, res, (a) => prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { admin: { select: { email: true } } }, ...a }),
    (l) => ({ id: l.id, adminId: l.adminId, adminEmail: l.admin.email, action: l.action, targetType: l.targetType, targetId: l.targetId, before: l.before, after: l.after, ip: l.ip, createdAt: iso(l.createdAt) }),
    q.limit, q.cursor);
}));

adminRouter.get('/admins', requireAdmin(), ah(async (req, res) => {
  if (req.admin!.role !== 'SUPER_ADMIN') throw new AppError(403, 'FORBIDDEN', 'Super admin only');
  ok(res, (await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } })).map(adminMe));
}));
adminRouter.post('/admins', requireAdmin(), ah(async (req, res) => {
  if (req.admin!.role !== 'SUPER_ADMIN') throw new AppError(403, 'FORBIDDEN', 'Super admin only');
  const b = parse(z.object({ email: z.string().email(), name: z.string().min(2).max(80), password: z.string().min(10).max(100), role: AdminRole }), req.body);
  if (await prisma.adminUser.findUnique({ where: { email: b.email.toLowerCase() } })) throw conflict('Admin already exists', 'EMAIL_TAKEN');
  const a = await prisma.adminUser.create({ data: { email: b.email.toLowerCase(), name: b.name, role: b.role, passwordHash: await bcrypt.hash(b.password, 10) } });
  await audit(req, 'ADMIN_CREATE', 'AdminUser', a.id, undefined, { email: a.email, role: a.role });
  created(res, adminMe(a));
}));

// ---------- support desk ----------
adminTicketRoutes(adminRouter, audit);
