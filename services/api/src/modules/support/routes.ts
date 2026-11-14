import { Router } from 'express';
import { CreateTicketSchema, TicketMessageSchema, cursorQuery } from '@help/validation';
import { prisma } from '../../lib/core';
import { AppError, ah, created, notFound, ok, page, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { emitToUser } from '../../realtime/bus';
import { emailTicketReceived, lastStaffMessageAt, toMessageDto, toTicketDto, ticketDetail, ticketInclude } from './service';

export const supportRouter = Router();
supportRouter.use(requireUser);

/** Ownership enforced in the query: other users' tickets are simply 404. */
async function ownTicket(id: string, userId: string) {
  const t = await prisma.supportTicket.findFirst({ where: { id, userId }, include: ticketInclude });
  if (!t) throw notFound('Ticket');
  return t;
}

supportRouter.post('/tickets', ah(async (req, res) => {
  const b = parse(CreateTicketSchema, req.body);
  const userId = req.user!.id;
  if (b.providerId && !(await prisma.providerProfile.findFirst({ where: { id: b.providerId }, select: { id: true } }))) {
    throw notFound('Provider');
  }
  if ((await prisma.supportTicket.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } })) >= 10) {
    throw new AppError(429, 'TICKET_LIMIT', 'Daily request limit reached');
  }
  const t = await prisma.supportTicket.create({
    data: {
      userId, category: b.category, subject: b.subject, providerId: b.providerId, userLastReadAt: new Date(),
      messages: { create: { authorUserId: userId, body: b.message, attachments: b.attachments } },
    },
    include: ticketInclude,
  });
  await emailTicketReceived(t);
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  created(res, await ticketDetail(t, me?.name ?? null));
}));

supportRouter.get('/tickets', ah(async (req, res) => {
  const q = parse(cursorQuery, req.query);
  const rows = await prisma.supportTicket.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const { items, nextCursor } = page(rows, q.limit);
  ok(res, await Promise.all(items.map(async (t) => toTicketDto(t, await lastStaffMessageAt(t.id)))), { nextCursor });
}));

supportRouter.get('/tickets/:id', ah(async (req, res) => {
  const t = await ownTicket(String(req.params.id), req.user!.id);
  const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
  const detail = await ticketDetail(t, me?.name ?? null);
  await prisma.supportTicket.update({ where: { id: t.id }, data: { userLastReadAt: new Date() } });
  ok(res, { ...detail, unreadForUser: false });
}));

supportRouter.post('/tickets/:id/messages', ah(async (req, res) => {
  const b = parse(TicketMessageSchema, req.body);
  const t = await ownTicket(String(req.params.id), req.user!.id);
  if (t.status === 'CLOSED') throw new AppError(409, 'TICKET_CLOSED', 'This request is closed. Open a new request.');
  const now = new Date();
  const [m] = await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: t.id, authorUserId: req.user!.id, body: b.body, attachments: b.attachments } }),
    prisma.supportTicket.update({ where: { id: t.id }, data: { lastMessageAt: now, userLastReadAt: now, status: t.status === 'WAITING_ON_USER' || t.status === 'RESOLVED' ? 'OPEN' : t.status } }),
  ]);
  const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
  await emitToUser(req.user!.id, { type: 'support.updated', ticketId: t.id });
  created(res, toMessageDto(m, me?.name ?? null));
}));

supportRouter.post('/tickets/:id/close', ah(async (req, res) => {
  const t = await ownTicket(String(req.params.id), req.user!.id);
  const upd = await prisma.supportTicket.update({ where: { id: t.id }, data: { status: 'CLOSED' } });
  await emitToUser(req.user!.id, { type: 'support.updated', ticketId: t.id });
  ok(res, toTicketDto(upd, await lastStaffMessageAt(t.id)));
}));
