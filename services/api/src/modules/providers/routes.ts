import { Router } from 'express';
import { z } from 'zod';
import {
  ContactSettingsSchema, PortfolioItemSchema, ProviderBasicsSchema, QuickRepliesSchema, SetStatusSchema, VisibilitySchema, ProviderLocationSchema, ProviderSkillsSchema, ServiceOfferingSchema, SubmitVerificationSchema, cursorQuery, lat, lng,
} from '@help/validation';
import { prisma } from '../../lib/core';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { AppError, ah, conflict, created, forbidden, notFound, ok, page, parse } from '../../lib/http';
import { optionalUser, requireUser } from '../../middleware/auth';
import { refreshDiscoverability } from './entitlement';
import { recordView, reviewDto, serviceDto } from './cards';
import {
  assertCategory, confirmStatus, contactSettings, dashboard, insights, setStatus, setVisibility, ensureSlug, myProviderDto, publicProfile, publishProvider, recompute, requireOwnProvider, unpublishProvider, upsertSkills,
} from './service';

export const providersRouter = Router();

const coordQuery = z.object({ lat: lat.optional(), lng: lng.optional() });

// ---------- self-management (must precede /:slug) ----------
const me = Router();
me.use(requireUser);

me.get('/', ah(async (req, res) => {
  const p = await prisma.providerProfile.findFirst({ where: { userId: req.user!.id, deletedAt: null }, select: { id: true } });
  ok(res, p ? await myProviderDto(p.id) : null);
}));

me.post('/', ah(async (req, res) => {
  const b = parse(ProviderBasicsSchema, req.body);
  if (await prisma.providerProfile.findFirst({ where: { userId: req.user!.id } })) throw conflict('You already have a provider profile', 'PROVIDER_EXISTS');
  await assertCategory(b.primaryCategoryId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { phoneVerified: true } });
  const p = await prisma.providerProfile.create({
    data: {
      userId: req.user!.id,
      slug: `p-${Math.random().toString(36).slice(2, 10)}`,
      displayName: b.displayName,
      headline: b.headline,
      bio: b.bio,
      avatarUrl: b.avatarUrl,
      coverUrl: b.coverUrl,
      primaryCategoryId: b.primaryCategoryId,
      experienceYears: b.experienceYears,
      languages: b.languages,
      qualifications: b.qualifications,
      mobileVerified: user.phoneVerified,
    },
  });
  await ensureSlug(p.id);
  await recompute(p.id);
  created(res, await myProviderDto(p.id));
}));

me.patch('/', ah(async (req, res) => {
  const b = parse(ProviderBasicsSchema.partial(), req.body);
  const p = await requireOwnProvider(req.user!.id);
  if (b.primaryCategoryId) await assertCategory(b.primaryCategoryId);
  await prisma.providerProfile.update({ where: { id: p.id }, data: b });
  await ensureSlug(p.id);
  await recompute(p.id);
  ok(res, await myProviderDto(p.id));
}));

me.put('/skills', ah(async (req, res) => {
  const { skills } = parse(ProviderSkillsSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  await upsertSkills(p.id, skills);
  await recompute(p.id);
  ok(res, await myProviderDto(p.id));
}));

me.put('/location', ah(async (req, res) => {
  const b = parse(ProviderLocationSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  await prisma.providerProfile.update({ where: { id: p.id }, data: b });
  await ensureSlug(p.id);
  await recompute(p.id);
  await refreshDiscoverability(p.id);
  ok(res, await myProviderDto(p.id));
}));

me.post('/services', ah(async (req, res) => {
  const b = parse(ServiceOfferingSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  if ((await prisma.serviceOffering.count({ where: { providerId: p.id, isActive: true } })) >= 30) throw conflict('Service limit reached', 'LIMIT_REACHED');
  if (b.categoryId) await assertCategory(b.categoryId);
  const s = await prisma.serviceOffering.create({ data: { ...b, providerId: p.id } });
  await recompute(p.id);
  created(res, serviceDto(s));
}));

me.patch('/services/:id', ah(async (req, res) => {
  const b = parse(ServiceOfferingSchema.partial(), req.body);
  const p = await requireOwnProvider(req.user!.id);
  const s = await prisma.serviceOffering.findFirst({ where: { id: String(req.params.id), providerId: p.id, isActive: true } });
  if (!s) throw notFound('Service');
  if (b.categoryId) await assertCategory(b.categoryId);
  ok(res, serviceDto(await prisma.serviceOffering.update({ where: { id: s.id }, data: b })));
}));

me.delete('/services/:id', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  const { count } = await prisma.serviceOffering.updateMany({ where: { id: String(req.params.id), providerId: p.id, isActive: true }, data: { isActive: false } });
  if (!count) throw notFound('Service');
  await recompute(p.id);
  ok(res, { deleted: true });
}));

me.post('/portfolio', ah(async (req, res) => {
  const b = parse(PortfolioItemSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  if ((await prisma.portfolioItem.count({ where: { providerId: p.id, deletedAt: null } })) >= 30) throw conflict('Portfolio limit reached', 'LIMIT_REACHED');
  const i = await prisma.portfolioItem.create({ data: { ...b, providerId: p.id } });
  await recompute(p.id);
  created(res, { id: i.id, kind: i.kind, url: i.url, title: i.title, description: i.description });
}));

me.delete('/portfolio/:id', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  const { count } = await prisma.portfolioItem.updateMany({ where: { id: String(req.params.id), providerId: p.id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (!count) throw notFound('Portfolio item');
  await recompute(p.id);
  ok(res, { deleted: true });
}));

me.get('/preview', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  ok(res, await publicProfile({ id: p.id }));
}));

me.post('/publish', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  await publishProvider(p.id);
  ok(res, await myProviderDto(p.id));
}));

me.post('/unpublish', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  await unpublishProvider(p.id);
  ok(res, await myProviderDto(p.id));
}));

me.get('/dashboard', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  ok(res, await dashboard(p.id));
}));

me.put('/status', ah(async (req, res) => {
  const b = parse(SetStatusSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  ok(res, await setStatus(p.id, b));
}));

me.post('/status/confirm', ah(async (req, res) => ok(res, await confirmStatus((await requireOwnProvider(req.user!.id)).id))));

me.put('/visibility', ah(async (req, res) => {
  const { visible } = parse(VisibilitySchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  ok(res, await setVisibility(p.id, visible));
}));

me.get('/insights', ah(async (req, res) => {
  const { days } = parse(z.object({ days: z.coerce.number().refine((d) => [7, 30, 90].includes(d), 'days must be 7, 30 or 90').default(30) }), req.query);
  ok(res, await insights((await requireOwnProvider(req.user!.id)).id, days));
}));

me.get('/contact-settings', ah(async (req, res) => ok(res, await contactSettings((await requireOwnProvider(req.user!.id)).id))));
me.put('/contact-settings', ah(async (req, res) => {
  const b = parse(ContactSettingsSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  await prisma.providerProfile.update({ where: { id: p.id }, data: b });
  ok(res, await contactSettings(p.id));
}));

me.get('/quick-replies', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  ok(res, { replies: p.quickReplies });
}));
me.put('/quick-replies', ah(async (req, res) => {
  const { replies } = parse(QuickRepliesSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  await prisma.providerProfile.update({ where: { id: p.id }, data: { quickReplies: replies } });
  ok(res, { replies });
}));

me.post('/verifications', ah(async (req, res) => {
  const b = parse(SubmitVerificationSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  if (await prisma.verification.findFirst({ where: { providerId: p.id, type: b.type, status: 'PENDING' } })) throw conflict('A verification of this type is already pending', 'ALREADY_PENDING');
  const v = await prisma.verification.create({ data: { providerId: p.id, type: b.type, documentUrl: b.documentUrl, label: b.label, status: 'PENDING' } });
  created(res, { id: v.id, status: v.status });
}));

providersRouter.use('/me', me);

// ---------- public ----------
/** Block the provider's account (chat between you is then refused). */
providersRouter.post('/:providerId/block', requireUser, ah(async (req, res) => {
  const p = await prisma.providerProfile.findFirst({ where: { id: String(req.params.providerId) }, select: { userId: true } });
  if (!p) throw notFound('Provider');
  if (p.userId === req.user!.id) throw forbidden('You cannot block yourself');
  await prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: p.userId } }, create: { blockerId: req.user!.id, blockedId: p.userId }, update: {} });
  ok(res, { blocked: true });
}));

const revealLimiter = rateLimit({
  windowMs: 86_400_000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? 'anon',
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ data: null, error: { code: 'PHONE_REVEAL_LIMIT', message: 'Daily phone reveal limit reached' } }),
});

/** Customer action: reveal the provider's phone (login required, provider must allow it). Logged as a contact event. */
providersRouter.post('/:providerId/phone', requireUser, revealLimiter, ah(async (req, res) => {
  const p = await prisma.providerProfile.findFirst({
    where: { id: String(req.params.providerId), deletedAt: null },
    select: { id: true, userId: true, isDiscoverable: true, showPhone: true, user: { select: { phone: true } } },
  });
  if (!p || !p.isDiscoverable) throw notFound('Provider');
  if (p.userId === req.user!.id) throw forbidden('This is your own profile');
  if (!p.showPhone || !p.user.phone) throw new AppError(403, 'PHONE_HIDDEN', 'This professional prefers chat');
  const blocked = await prisma.block.findFirst({
    where: { OR: [{ blockerId: req.user!.id, blockedId: p.userId }, { blockerId: p.userId, blockedId: req.user!.id }] },
    select: { blockerId: true },
  });
  if (blocked) throw new AppError(403, 'BLOCKED', 'You cannot contact this professional');
  await prisma.contactEvent.create({ data: { providerId: p.id, userId: req.user!.id, kind: 'PHONE_REVEALED' } });
  ok(res, { phone: p.user.phone });
}));

providersRouter.get('/:providerId/reviews', ah(async (req, res) => {
  const q = parse(cursorQuery, req.query);
  const provider = await prisma.providerProfile.findFirst({ where: { id: String(req.params.providerId), status: 'PUBLISHED', deletedAt: null }, select: { id: true } });
  if (!provider) throw notFound('Provider');
  const rows = await prisma.review.findMany({
    where: { providerId: provider.id, status: 'VISIBLE' },
    include: { author: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = page(rows, q.limit);
  ok(res, items.map(reviewDto), { nextCursor });
}));

providersRouter.get('/:slug', optionalUser, ah(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const c = parse(coordQuery, req.query);
  const from = c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
  const profile = await publicProfile({ slug, isDiscoverable: true, deletedAt: null }, { from });
  if (profile) {
    const owner = await prisma.providerProfile.findUnique({ where: { id: profile.id }, select: { userId: true } });
    if (owner?.userId !== req.user?.id) recordView(profile.id, req.user?.id).catch(() => undefined);
    return ok(res, profile);
  }
  const old = await prisma.slugHistory.findUnique({ where: { slug }, include: { provider: { select: { slug: true, isDiscoverable: true } } } });
  if (old?.provider.isDiscoverable) return ok(res, { redirectTo: old.provider.slug });
  throw notFound('Provider');
}));
