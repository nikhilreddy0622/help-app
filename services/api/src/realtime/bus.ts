import { EventEmitter } from 'node:events';
import pg from 'pg';
import type { RealtimeEvent } from '@help/types';
import { env } from '../config/env';
import { logger, prisma, randomToken } from '../lib/core';

/**
 * In-process event bus + Postgres LISTEN/NOTIFY fan-out so multiple API
 * instances (Render) deliver events to users connected to any instance.
 * Payload: { i: instanceId, userId, event } on channel "realtime" (<8KB;
 * oversized notification events are sent as a reference and re-hydrated).
 */
const CHANNEL = 'realtime';
const INSTANCE = randomToken(6);
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

type Listener = (event: RealtimeEvent) => void;

export function subscribeUser(userId: string, fn: Listener): () => void {
  void ensureListener();
  emitter.on(`u:${userId}`, fn);
  return () => emitter.off(`u:${userId}`, fn);
}

function deliverLocal(userId: string, event: RealtimeEvent) {
  emitter.emit(`u:${userId}`, event);
}

/** Deliver to the user's local connections and publish for other instances. Never throws. */
export async function emitToUser(userId: string, event: RealtimeEvent): Promise<void> {
  deliverLocal(userId, event);
  try {
    let wire: unknown = event;
    if (Buffer.byteLength(JSON.stringify(event)) > 7000 && event.type === 'notification.created') {
      wire = { type: 'notification.ref', id: event.notification.id, unreadCount: event.unreadCount };
    }
    const payload = JSON.stringify({ i: INSTANCE, userId, event: wire });
    if (Buffer.byteLength(payload) < 7900) await prisma.$queryRaw`SELECT pg_notify(${CHANNEL}, ${payload})`;
  } catch (e) {
    logger.warn({ err: e }, 'realtime publish failed');
  }
}

let client: pg.Client | null = null;
let starting: Promise<void> | null = null;
let stopped = false;

export function ensureListener(): Promise<void> {
  if (client || starting) return starting ?? Promise.resolve();
  stopped = false;
  starting = (async () => {
    const c = new pg.Client({ connectionString: env.DATABASE_URL });
    try {
      await c.connect();
      await c.query(`LISTEN ${CHANNEL}`);
      c.on('notification', (msg) => {
        void (async () => {
          try {
            const p = JSON.parse(msg.payload ?? '{}') as { i: string; userId: string; event: RealtimeEvent | { type: 'notification.ref'; id: string; unreadCount: number } };
            if (p.i === INSTANCE) return;
            let ev = p.event as RealtimeEvent;
            if ((p.event as { type: string }).type === 'notification.ref') {
              const { getNotificationDto } = await import('../modules/notifications/service');
              const ref = p.event as { id: string; unreadCount: number };
              const n = await getNotificationDto(p.userId, ref.id);
              if (!n) return;
              ev = { type: 'notification.created', notification: n, unreadCount: ref.unreadCount };
            }
            deliverLocal(p.userId, ev);
          } catch (e) {
            logger.warn({ err: e }, 'realtime message error');
          }
        })();
      });
      const onDrop = () => {
        client = null;
        if (!stopped) setTimeout(() => void ensureListener(), 2000).unref();
      };
      c.on('error', (e) => {
        logger.warn({ err: e }, 'realtime listener error');
        c.end().catch(() => undefined);
        onDrop();
      });
      c.on('end', onDrop);
      client = c;
    } catch (e) {
      logger.warn({ err: e }, 'realtime listener unavailable; single-instance delivery only');
      c.end().catch(() => undefined);
      if (!stopped) setTimeout(() => void ensureListener(), 5000).unref();
    } finally {
      starting = null;
    }
  })();
  return starting;
}

export async function stopRealtime(): Promise<void> {
  stopped = true;
  const c = client;
  client = null;
  await c?.end().catch(() => undefined);
}
