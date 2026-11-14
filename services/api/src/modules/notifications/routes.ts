import { Router } from 'express';
import { z } from 'zod';
import { NotificationCategorySchema, NotificationListQuery, NotificationPreferencesSchema } from '@help/validation';
import { prisma } from '../../lib/core';
import { ah, notFound, ok, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { emitToUser, subscribeUser } from '../../realtime/bus';
import { getPreferences, listNotifications, setPreferences, unreadCounts } from './service';

export const notificationsRouter = Router();

const MAX_STREAMS_PER_USER = 5;
const streams = new Map<string, Set<import('express').Response>>();

/** Live events (SSE). Auth via Authorization header only. */
notificationsRouter.get('/stream', requireUser, (req, res) => {
  const userId = req.user!.id;
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  const set = streams.get(userId) ?? new Set();
  streams.set(userId, set);
  while (set.size >= MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value as import('express').Response;
    set.delete(oldest);
    oldest.end();
  }
  set.add(res);

  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: 'ping' });
  const unsubscribe = subscribeUser(userId, send);
  const timer = setInterval(() => send({ type: 'ping' }), 25_000);
  const cleanup = () => {
    clearInterval(timer);
    unsubscribe();
    set.delete(res);
    if (!set.size) streams.delete(userId);
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
});

notificationsRouter.use(requireUser);

notificationsRouter.get('/', ah(async (req, res) => {
  const q = parse(NotificationListQuery, req.query);
  const { items, nextCursor } = await listNotifications(req.user!.id, q);
  ok(res, items, { nextCursor });
}));

notificationsRouter.get('/unread-count', ah(async (req, res) => ok(res, await unreadCounts(req.user!.id))));

notificationsRouter.get('/preferences', ah(async (req, res) => ok(res, await getPreferences(req.user!.id))));
notificationsRouter.put('/preferences', ah(async (req, res) => {
  ok(res, await setPreferences(req.user!.id, parse(NotificationPreferencesSchema, req.body)));
}));

async function emitRead(userId: string, ids: string[] | 'all') {
  await emitToUser(userId, { type: 'notification.read', ids, unreadCount: (await unreadCounts(userId)).count });
}

notificationsRouter.post('/read-all', ah(async (req, res) => {
  const body = parse(z.object({ category: NotificationCategorySchema.optional() }), req.body ?? {});
  await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null, ...(body.category ? { category: body.category } : {}) }, data: { readAt: new Date() } });
  await emitRead(req.user!.id, 'all');
  ok(res, { ok: true });
}));

notificationsRouter.post('/read-group', ah(async (req, res) => {
  const { groupKey } = parse(z.object({ groupKey: z.string().min(1).max(200) }), req.body);
  const rows = await prisma.notification.findMany({ where: { userId: req.user!.id, groupKey, readAt: null }, select: { id: true } });
  await prisma.notification.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { readAt: new Date() } });
  if (rows.length) await emitRead(req.user!.id, rows.map((r) => r.id));
  ok(res, { ok: true });
}));

notificationsRouter.post('/:id/read', ah(async (req, res) => {
  const id = String(req.params.id);
  const { count } = await prisma.notification.updateMany({ where: { id, userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  if (!count && !(await prisma.notification.findFirst({ where: { id, userId: req.user!.id }, select: { id: true } }))) throw notFound('Notification');
  if (count) await emitRead(req.user!.id, [id]);
  ok(res, { ok: true });
}));

notificationsRouter.delete('/:id', ah(async (req, res) => {
  const { count } = await prisma.notification.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!count) throw notFound('Notification');
  await emitRead(req.user!.id, [String(req.params.id)]);
  ok(res, { deleted: true });
}));
