import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RealtimeEvent } from '@help/types';
import { notifyUser } from '../src/integrations/notify';
import { pushLog } from '../src/integrations/push';
import { stopRealtime } from '../src/realtime/bus';
import { V1, app, api, dbReady, loginPhone } from './helpers';

let ready = false;
let server: Server;
let base = '';
beforeAll(async () => {
  ready = await dbReady();
  if (!ready) {
    console.warn('SKIPPED notification tests: database not reachable');
    return;
  }
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${V1}`;
});
afterAll(async () => {
  server?.closeAllConnections?.();
  server?.close();
  await stopRealtime();
});
const t = (name: string, fn: () => Promise<void>) => it(name, async (ctx) => (ready ? fn() : ctx.skip()));

/** Minimal SSE reader over fetch (Authorization header, no token in URL). */
async function openStream(token: string) {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
  expect(res.headers.get('content-type')).toContain('text/event-stream');
  expect(res.headers.get('x-accel-buffering')).toBe('no');
  const events: RealtimeEvent[] = [];
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (chunk.startsWith('data: ')) events.push(JSON.parse(chunk.slice(6)));
        }
      }
    } catch {
      /* aborted */
    }
  })();
  return { events, close: () => ctrl.abort() };
}
const until = async (cond: () => boolean, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end && !cond()) await new Promise((r) => setTimeout(r, 25));
};

describe('realtime stream', () => {
  t('requires auth', async () => {
    const res = await fetch(`${base}/notifications/stream`);
    expect(res.status).toBe(401);
  });

  t('delivers notification.created to the right user only', async () => {
    const a = await loginPhone();
    const b = await loginPhone();
    const sa = await openStream(a.access);
    const sb = await openStream(b.access);
    await until(() => sa.events.length > 0 && sb.events.length > 0); // initial ping
    await notifyUser(a.userId, { type: 'TEST', category: 'STATUS', title: 'Hello A', body: 'only for A', link: '/bookings/x' });
    await until(() => sa.events.some((e) => e.type === 'notification.created'));
    await new Promise((r) => setTimeout(r, 300));
    const got = sa.events.find((e) => e.type === 'notification.created');
    expect(got).toBeTruthy();
    if (got?.type === 'notification.created') {
      expect(got.notification.title).toBe('Hello A');
      expect(got.unreadCount).toBe(1);
    }
    expect(sb.events.some((e) => e.type === 'notification.created')).toBe(false);
    sa.close();
    sb.close();
  });
});

describe('preferences and quiet hours', () => {
  t('quiet hours suppress non-important push; important still pushes', async () => {
    const u = await loginPhone();
    const now = new Date();
    const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const prefs = {
      channels: Object.fromEntries(['STATUS', 'MESSAGES', 'REVIEWS', 'PAYMENTS', 'ACCOUNT', 'PROMOTIONS'].map((c) => [c, { push: true, email: true }])),
      quietHours: { enabled: true, startMinute: (minute + 1440 - 60) % 1440, endMinute: (minute + 60) % 1440, timezone: 'UTC' },
    };
    await api().put(`${V1}/notifications/preferences`).set(u.auth).send(prefs).expect(200);

    pushLog.length = 0;
    await notifyUser(u.userId, { type: 'T1', category: 'REVIEWS', title: 'quiet', body: 'suppressed' });
    expect(pushLog.filter((p) => p.userId === u.userId)).toHaveLength(0);
    await notifyUser(u.userId, { type: 'T2', category: 'STATUS', title: 'urgent', body: 'important', important: true, link: '/bookings/1' });
    const pushed = pushLog.filter((p) => p.userId === u.userId);
    expect(pushed).toHaveLength(1);
    expect(pushed[0]!.payload.channelId).toBe('status');
    expect(pushed[0]!.payload.data).toMatchObject({ link: '/bookings/1', category: 'STATUS' });
    expect(pushed[0]!.payload.data?.notificationId).toBeTruthy();
    // in-app rows are always kept
    const list = await api().get(`${V1}/notifications`).set(u.auth).expect(200);
    expect(list.body.data).toHaveLength(2);

    // PROMOTIONS push is off by default and respected
    const d = await loginPhone();
    pushLog.length = 0;
    await notifyUser(d.userId, { type: 'PROMO', category: 'PROMOTIONS', title: 'sale', body: 'x' });
    expect(pushLog.filter((p) => p.userId === d.userId)).toHaveLength(0);
    const defaults = await api().get(`${V1}/notifications/preferences`).set(d.auth).expect(200);
    expect(defaults.body.data.channels.PROMOTIONS).toEqual({ push: false, email: false });
    expect(defaults.body.data.quietHours).toMatchObject({ enabled: false, startMinute: 1320, endMinute: 420, timezone: 'Asia/Kolkata' });
  });
});

describe('grouping', () => {
  t('collapses by groupKey with unread groupCount and marks the group read', async () => {
    const u = await loginPhone();
    for (let i = 0; i < 3; i++) await notifyUser(u.userId, { type: 'MESSAGE', category: 'MESSAGES', title: 'Rahul', body: `msg ${i}`, groupKey: 'msg:b1', link: '/messages/b1' });
    await notifyUser(u.userId, { type: 'X', category: 'STATUS', title: 'Other', body: 'single' });

    const list = await api().get(`${V1}/notifications`).set(u.auth).expect(200);
    expect(list.body.data).toHaveLength(2);
    const grouped = list.body.data.find((n: { groupKey: string | null }) => n.groupKey === 'msg:b1');
    expect(grouped.groupCount).toBe(3);
    expect(grouped.body).toBe('msg 2'); // latest in group

    const count = await api().get(`${V1}/notifications/unread-count`).set(u.auth).expect(200);
    expect(count.body.data.count).toBe(4);
    expect(count.body.data.byCategory).toMatchObject({ MESSAGES: 3, STATUS: 1 });

    await api().post(`${V1}/notifications/read-group`).set(u.auth).send({ groupKey: 'msg:b1' }).expect(200);
    const after = await api().get(`${V1}/notifications/unread-count`).set(u.auth).expect(200);
    expect(after.body.data.count).toBe(1);

    const filtered = await api().get(`${V1}/notifications`).set(u.auth).query({ category: 'STATUS', unreadOnly: 'true' }).expect(200);
    expect(filtered.body.data).toHaveLength(1);
    await api().post(`${V1}/notifications/read-all`).set(u.auth).send({}).expect(200);
    expect((await api().get(`${V1}/notifications/unread-count`).set(u.auth)).body.data.count).toBe(0);
  });
});
