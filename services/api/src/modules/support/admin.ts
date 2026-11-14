import type { Request, Router } from 'express';
import { TicketMessageSchema, TicketStatusSchema, cursorQuery } from '@help/validation';
import { z } from 'zod';
import { prisma } from '../../lib/core';
import { ah, created, notFound, ok, parse } from '../../lib/http';
import { requireAdmin } from '../../middleware/auth';
import { emitToUser } from '../../realtime/bus';
import { lastStaffMessageAt, notifyTicketReply, ticketDetail, ticketInclude, toMessageDto, toTicketDto } from './service';

type Audit = (req: Request, action: string, targetType: string, targetId: string | null, before?: unknown, after?: unknown) => Promise<void>;

/** Admin support desk routes (SUPPORT, OPERATIONS; SUPER_ADMIN always). Mounted under /admin. */
export function adminTicketRoutes(router: Router, audit: Audit) {
  const guard = requireAdmin('SUPPORT', 'OPERATIONS');

  router.get('/support/tickets', guard, ah(async (req, res) => {
    const q = parse(cursorQuery.extend({ limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(['OPEN', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED']).optional(), q: z.string().max(100).optional() }), req.query);
    const num = q.q && /^#?\d+$/.test(q.q) ? Number(q.q.replace('#', '')) : undefined;
    const rows = await prisma.supportTicket.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.q ? { OR: [...(num ? [{ number: num }] : []), { subject: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    const items = hasMore ? rows.slice(0, q.limit) : rows;
    ok(res, await Promise.all(items.map(async (t) => ({ ...toTicketDto(t, await lastStaffMessageAt(t.id)), userName: t.user.name ?? 'User', userId: t.userId }))), { nextCursor: hasMore ? items[items.length - 1]!.id : null });
  }));

  router.get('/support/tickets/:id', guard, ah(async (req, res) => {
    const t = await prisma.supportTicket.findUnique({ where: { id: String(req.params.id) }, include: { ...ticketInclude, user: { select: { name: true } } } });
    if (!t) throw notFound('Ticket');
    ok(res, { ...(await ticketDetail(t, t.user.name)), userName: t.user.name ?? 'User', userId: t.userId });
  }));

  router.post('/support/tickets/:id/messages', guard, ah(async (req, res) => {
    const b = parse(TicketMessageSchema, req.body);
    const t = await prisma.supportTicket.findUnique({ where: { id: String(req.params.id) } });
    if (!t) throw notFound('Ticket');
    const [m] = await prisma.$transaction([
      prisma.supportMessage.create({ data: { ticketId: t.id, authorAdminId: req.admin!.id, body: b.body, attachments: b.attachments } }),
      prisma.supportTicket.update({ where: { id: t.id }, data: { lastMessageAt: new Date(), status: t.status === 'CLOSED' ? 'CLOSED' : 'WAITING_ON_USER' } }),
    ]);
    await audit(req, 'SUPPORT_REPLY', 'SupportTicket', t.id, undefined, { messageId: m.id });
    await notifyTicketReply(t, b.body, m.id);
    created(res, toMessageDto(m, null));
  }));

  router.post('/support/tickets/:id/status', guard, ah(async (req, res) => {
    const { status } = parse(TicketStatusSchema, req.body);
    const t = await prisma.supportTicket.findUnique({ where: { id: String(req.params.id) } });
    if (!t) throw notFound('Ticket');
    const upd = await prisma.supportTicket.update({ where: { id: t.id }, data: { status } });
    await audit(req, 'SUPPORT_STATUS', 'SupportTicket', t.id, { status: t.status }, { status });
    await emitToUser(t.userId, { type: 'support.updated', ticketId: t.id });
    ok(res, toTicketDto(upd, await lastStaffMessageAt(t.id)));
  }));
}
