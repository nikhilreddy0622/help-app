import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import { prisma, randomToken, sha256 } from '../../lib/core';
import { unauthorized } from '../../lib/http';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessClaims { sub: string; sid: string; kind: 'user' | 'admin'; role?: string; pv?: number }

export async function signAccess(claims: AccessClaims): Promise<string> {
  return new SignJWT({ sid: claims.sid, kind: claims.kind, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SEC}s`)
    .sign(accessKey);
}

export async function verifyAccess(token: string): Promise<AccessClaims> {
  try {
    const { payload } = await jwtVerify(token, accessKey, { algorithms: ['HS256'] });
    return { sub: String(payload.sub), sid: String(payload.sid), kind: payload.kind as 'user' | 'admin', role: payload.role as string | undefined, pv: payload.pv as number | undefined };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

interface SessionMeta { deviceName?: string; platform: string; ip?: string; userAgent?: string }

/** Create a new session (one per device) and return a token pair. */
export async function issueSession(userId: string, meta: SessionMeta, familyId?: string) {
  const refreshToken = randomToken(48);
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: sha256(refreshToken),
      familyId: familyId ?? randomToken(12),
      deviceName: meta.deviceName,
      platform: meta.platform,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 255),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  const accessToken = await signAccess({ sub: userId, sid: session.id, kind: 'user' });
  return { accessToken, refreshToken, expiresIn: env.ACCESS_TOKEN_TTL_SEC, sessionId: session.id };
}

/**
 * Rotate a refresh token. Reuse of an already-rotated token revokes the whole
 * family (stolen-token detection).
 */
export async function rotateRefresh(refreshToken: string, meta: SessionMeta) {
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: sha256(refreshToken) } });
  if (!session) throw unauthorized('Invalid refresh token');
  if (session.revokedAt) {
    await prisma.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw unauthorized('Session revoked');
  }
  if (session.expiresAt < new Date()) throw unauthorized('Session expired');
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true } });
  if (!user || user.status !== 'ACTIVE') throw unauthorized('Account unavailable');

  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return issueSession(session.userId, { ...meta, deviceName: session.deviceName ?? meta.deviceName, platform: session.platform }, session.familyId);
}

/** Admin console access token (8h, no refresh); verified by requireAdmin. */
export async function signAdminAccess(adminId: string, role: string, pv = 0): Promise<string> {
  return new SignJWT({ sid: 'admin', kind: 'admin', role, pv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(accessKey);
}
