import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { SendMessageSchema, StartConversationSchema, cursorQuery } from '@help/validation';
import { env } from '../../config/env';
import { prisma } from '../../lib/core';
import { ah, created, ok, page, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { convoInclude, loadConversationFor, markRead, messageDto, sendMessage, startConversation, toConversationDto } from './service';

export const conversationsRouter = Router();
conversationsRouter.use(requireUser);

const sendLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? 'anon',
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

conversationsRouter.post('/', sendLimiter, ah(async (req, res) => {
  const b = parse(StartConversationSchema, req.body);
  created(res, await startConversation(req.user!.id, b.providerId, b.message));
}));

conversationsRouter.get('/', ah(async (req, res) => {
  const q = parse(cursorQuery.extend({ role: z.enum(['customer', 'provider']).optional() }), req.query);
  const userId = req.user!.id;
  const where =
    q.role === 'customer' ? { customerId: userId } : q.role === 'provider' ? { provider: { userId } } : { OR: [{ customerId: userId }, { provider: { userId } }] };
  const rows = await prisma.conversation.findMany({
    where: { ...where, messages: { some: {} } },
    include: convoInclude(userId),
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = page(rows, q.limit);
  const reviewed = new Set(
    (await prisma.review.findMany({ where: { authorId: userId, providerId: { in: items.map((i) => i.providerId) } }, select: { providerId: true } })).map((r) => r.providerId),
  );
  ok(res, items.map((c) => toConversationDto(c, userId, reviewed.has(c.providerId))), { nextCursor });
}));

conversationsRouter.get('/:id', ah(async (req, res) => ok(res, (await loadConversationFor(String(req.params.id), req.user!.id)).dto)));

/** Newest first; nextCursor pages to older messages. */
conversationsRouter.get('/:id/messages', ah(async (req, res) => {
  const q = parse(cursorQuery, req.query);
  const { convo } = await loadConversationFor(String(req.params.id), req.user!.id);
  const rows = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = page(rows, q.limit);
  ok(res, items.map(messageDto), { nextCursor });
}));

conversationsRouter.post('/:id/messages', sendLimiter, ah(async (req, res) => {
  const { body } = parse(SendMessageSchema, req.body);
  created(res, await sendMessage(req.user!.id, String(req.params.id), body));
}));

conversationsRouter.post('/:id/read', ah(async (req, res) => {
  await markRead(req.user!.id, String(req.params.id));
  ok(res, { ok: true });
}));
