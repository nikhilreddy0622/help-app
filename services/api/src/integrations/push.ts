import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { logger, prisma } from '../lib/core';

export interface PushPayload { title: string; body: string; data?: Record<string, unknown>; /** Android channel id */ channelId?: string }

let app: App | null | undefined;
function getApp(): App | null {
  if (app !== undefined) return app;
  if (!env.FCM_SERVICE_ACCOUNT_B64) return (app = null);
  try {
    const json = JSON.parse(Buffer.from(env.FCM_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
    app = getApps()[0] ?? initializeApp({ credential: cert(json) });
  } catch (e) {
    logger.error({ err: e }, 'invalid FCM_SERVICE_ACCOUNT_B64');
    app = null;
  }
  return app;
}

/** Test hook: records push calls (NODE_ENV=test only). */
export const pushLog: { userId: string; payload: PushPayload }[] = [];

/** Best-effort FCM push to all of a user's devices; no-op when not configured. Removes dead tokens. */
export async function sendPush(userId: string, p: PushPayload): Promise<void> {
  if (env.NODE_ENV === 'test') pushLog.push({ userId, payload: p });
  const fb = getApp();
  if (!fb) return;
  const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
  if (!tokens.length) return;
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.data ?? {})) if (v != null) data[k] = typeof v === 'string' ? v : JSON.stringify(v);
  const res = await getMessaging(fb).sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: p.title, body: p.body },
    data,
    android: { priority: 'high', notification: { channelId: p.channelId ?? 'default' } },
  });
  const dead: string[] = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') dead.push(tokens[i]!.token);
  });
  if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
}
