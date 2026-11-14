import { createHash, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { env, isProd } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProd ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.refreshToken', '*.code', '*.idToken'],
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (!isProd) globalForPrisma.prisma = prisma;

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function hmacSha256Hex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
