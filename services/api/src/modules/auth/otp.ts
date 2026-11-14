import { randomInt } from 'node:crypto';
import { env, isProd } from '../../config/env';
import { queueEmail } from '../../integrations/email';
import { logger, prisma, safeEqual, sha256 } from '../../lib/core';
import { AppError, unavailable } from '../../lib/http';

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_PER_HOUR = 5;

export type OtpChannel = 'PHONE' | 'EMAIL';

/** Test-only: the last code issued per identifier (phone or email). Never populated outside NODE_ENV=test. */
const testCodes = new Map<string, string>();
export const getLastOtpForTest = (identifier: string): string | undefined => testCodes.get(identifier);

/** Delivery is pluggable; `console` logs the code (dev only). EMAIL always goes through the email pipeline. */
async function deliver(channel: OtpChannel, identifier: string, code: string, challengeId: string): Promise<void> {
  if (env.NODE_ENV === 'test') testCodes.set(identifier, code);
  if (channel === 'EMAIL') {
    // dedupeKey is per challenge so each new code is sent, but a retried job never double-sends.
    if (!isProd && !env.SMTP_HOST) logger.warn({ email: identifier }, `DEV email OTP for ${identifier}: ${code}`);
    await queueEmail({ to: identifier, template: 'otp-code', dedupeKey: `otp-code:${challengeId}`, vars: { code, name: 'there' } });
    return;
  }
  switch (env.OTP_PROVIDER) {
    case 'console':
      if (isProd) throw unavailable('SMS OTP');
      logger.warn({ phone: identifier }, `DEV OTP for ${identifier}: ${code}`);
      return;
    case 'msg91': {
      if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) throw unavailable('MSG91');
      const res = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: { authkey: env.MSG91_AUTH_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ template_id: env.MSG91_TEMPLATE_ID, recipients: [{ mobiles: identifier.replace('+', ''), otp: code }] }),
      });
      if (!res.ok) throw new AppError(502, 'SMS_FAILED', 'Could not send OTP, please retry');
      return;
    }
    case 'firebase':
      // Firebase Phone Auth verifies on the client; server verifies the Firebase ID token instead.
      throw new AppError(400, 'USE_FIREBASE_CLIENT', 'OTP is handled by Firebase on this deployment');
  }
}

export async function requestOtp(identifier: string, channel: OtpChannel = 'PHONE'): Promise<{ resendAfterSec: number }> {
  const since = new Date(Date.now() - 3_600_000);
  const recent = await prisma.otpChallenge.findMany({ where: { phone: identifier, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' } });
  if (recent.length >= MAX_PER_HOUR) throw new AppError(429, 'OTP_LIMIT', 'Too many OTP requests. Try again later.');
  const last = recent[0];
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError(429, 'OTP_COOLDOWN', 'Please wait before requesting another OTP');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const ch = await prisma.otpChallenge.create({ data: { channel, phone: identifier, codeHash: sha256(`${identifier}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  await deliver(channel, identifier, code, ch.id);
  return { resendAfterSec: RESEND_COOLDOWN_MS / 1000 };
}

/** Verifies and consumes the latest challenge. Throws on failure. */
export async function verifyOtp(identifier: string, code: string): Promise<void> {
  const ch = await prisma.otpChallenge.findFirst({ where: { phone: identifier, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!ch || ch.expiresAt < new Date()) throw new AppError(400, 'OTP_EXPIRED', 'OTP expired. Request a new one.');
  if (ch.attempts >= MAX_ATTEMPTS) throw new AppError(429, 'OTP_LOCKED', 'Too many wrong attempts. Request a new OTP.');
  if (!safeEqual(ch.codeHash, sha256(`${identifier}:${code}`))) {
    await prisma.otpChallenge.update({ where: { id: ch.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(400, 'OTP_INVALID', 'Incorrect OTP');
  }
  // Atomic consume guards against double use under concurrency.
  const { count } = await prisma.otpChallenge.updateMany({ where: { id: ch.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (count === 0) throw new AppError(400, 'OTP_INVALID', 'OTP already used');
}
