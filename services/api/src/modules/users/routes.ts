import { Router } from 'express';
import { PushTokenSchema, UpdateMeSchema, cursorQuery } from '@help/validation';
import { prisma } from '../../lib/core';
import { ah, conflict, forbidden, notFound, ok, page, parse, badRequest } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { getMe } from '../auth/service';
import { freshCardInclude, toCard } from '../providers/cards';
import { deleteAccount, exportAccount } from './service';

export const usersRouter = Router();
usersRouter.use(requireUser);

usersRouter.patch('/me', ah(async (req, res) => {
  const b = parse(UpdateMeSchema, req.body);
  const data: Record<string, unknown> = { ...b };
  if (b.email !== undefined) {
    const email = b.email.toLowerCase();
    const current = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { email: true } });
    if (current.email !== email) {
      if (await prisma.user.findFirst({ where: { email, NOT: { id: req.user!.id } }, select: { id: true } })) throw conflict('This email is already in use', 'EMAIL_TAKEN');
      data.email = email;
      data.emailVerified = false;
    } else delete data.email;
  }
  if (b.timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: b.timezone });
    } catch {
      throw badRequest('Unknown timezone');
    }
  }
  await prisma.user.update({ where: { id: req.user!.id }, data });
  // One photo per person: a professional's public photo follows their account photo (getMe prefers the provider's).
  if (b.avatarUrl) await prisma.providerProfile.updateMany({ where: { userId: req.user!.id }, data: { avatarUrl: b.avatarUrl } });
  ok(res, await getMe(req.user!.id));
}));

usersRouter.post('/me/push-tokens', ah(async (req, res) => {
  const b = parse(PushTokenSchema, req.body);
  await prisma.pushToken.upsert({ where: { token: b.token }, create: { token: b.token, platform: b.platform, userId: req.user!.id }, update: { userId: req.user!.id, platform: b.platform } });
  ok(res, { ok: true });
}));

usersRouter.delete('/me', ah(async (req, res) => {
  await deleteAccount(req.user!.id);
  ok(res, { deleted: true });
}));

usersRouter.get('/me/export', ah(async (req, res) => ok(res, await exportAccount(req.user!.id))));

usersRouter.get('/me/saved', ah(async (req, res) => {
  const q = parse(cursorQuery, req.query);
  const now = new Date();
  const saved = await prisma.savedProfessional.findMany({
    where: { userId: req.user!.id, provider: { isDiscoverable: true, deletedAt: null, isPaused: false } },
    orderBy: [{ createdAt: 'desc' }, { providerId: 'desc' }],
    include: { provider: { include: freshCardInclude(now) } },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { userId_providerId: { userId: req.user!.id, providerId: q.cursor } }, skip: 1 } : {}),
  });
  const { items, nextCursor } = page(saved.map((s) => ({ id: s.providerId, card: toCard(s.provider, { now }) })), q.limit);
  ok(res, items.map((i) => i.card), { nextCursor });
}));

usersRouter.get('/me/recently-viewed', ah(async (req, res) => {
  const now = new Date();
  const rows = await prisma.providerView.findMany({
    where: { userId: req.user!.id, provider: { isDiscoverable: true, deletedAt: null, isPaused: false } },
    orderBy: { viewedAt: 'desc' },
    take: 20,
    include: { provider: { include: freshCardInclude(now) } },
  });
  ok(res, rows.map((r) => toCard(r.provider, { now })));
}));

usersRouter.put('/me/saved/:providerId', ah(async (req, res) => {
  const providerId = String(req.params.providerId);
  const p = await prisma.providerProfile.findFirst({ where: { id: providerId, deletedAt: null, status: 'PUBLISHED' }, select: { id: true } });
  if (!p) throw notFound('Provider');
  const had = await prisma.savedProfessional.findUnique({ where: { userId_providerId: { userId: req.user!.id, providerId } }, select: { userId: true } });
  await prisma.savedProfessional.upsert({ where: { userId_providerId: { userId: req.user!.id, providerId } }, create: { userId: req.user!.id, providerId }, update: {} });
  if (!had) await prisma.contactEvent.create({ data: { providerId, userId: req.user!.id, kind: 'SAVED' } });
  ok(res, { saved: true });
}));

usersRouter.delete('/me/saved/:providerId', ah(async (req, res) => {
  await prisma.savedProfessional.deleteMany({ where: { userId: req.user!.id, providerId: String(req.params.providerId) } });
  ok(res, { saved: false });
}));

usersRouter.get('/me/recent-searches', ah(async (req, res) => {
  const rows = await prisma.recentSearch.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 10 });
  ok(res, rows.map((r) => ({ id: r.id, query: r.query, createdAt: r.createdAt.toISOString() })));
}));

usersRouter.post('/:userId/block', ah(async (req, res) => {
  const blockedId = String(req.params.userId);
  if (blockedId === req.user!.id) throw forbidden('You cannot block yourself');
  if (!(await prisma.user.findFirst({ where: { id: blockedId, status: { not: 'DELETED' } }, select: { id: true } }))) throw notFound('User');
  await prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId } }, create: { blockerId: req.user!.id, blockedId }, update: {} });
  ok(res, { blocked: true });
}));

usersRouter.delete('/:userId/block', ah(async (req, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.user!.id, blockedId: String(req.params.userId) } });
  ok(res, { blocked: false });
}));
