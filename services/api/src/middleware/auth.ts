import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/core';
import { forbidden, unauthorized } from '../lib/http';
import { verifyAccess } from '../modules/auth/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; sessionId: string };
      admin?: { id: string; role: string };
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Requires a valid user access token whose session is still live. */
export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = bearer(req);
    if (!token) throw unauthorized();
    const claims = await verifyAccess(token);
    if (claims.kind !== 'user') throw unauthorized();
    // Session check makes per-device logout effective immediately (one indexed PK lookup).
    const session = await prisma.session.findUnique({ where: { id: claims.sid }, select: { revokedAt: true, userId: true } });
    if (!session || session.revokedAt || session.userId !== claims.sub) throw unauthorized('Session ended');
    req.user = { id: claims.sub, sessionId: claims.sid };
    next();
  } catch (e) {
    next(e);
  }
}

/** Attaches the user if a valid token is present, otherwise continues anonymously. */
export async function optionalUser(req: Request, res: Response, next: NextFunction) {
  if (!bearer(req)) return next();
  return requireUser(req, res, (err?: unknown) => (err ? next() : next()));
}

export type AdminRoleName = 'SUPER_ADMIN' | 'OPERATIONS' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

/** Admin token + role check. SUPER_ADMIN passes every check. */
export function requireAdmin(...roles: AdminRoleName[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = bearer(req);
      if (!token) throw unauthorized();
      const claims = await verifyAccess(token);
      if (claims.kind !== 'admin' || !claims.role) throw unauthorized();
      const admin = await prisma.adminUser.findUnique({ where: { id: claims.sub }, select: { isActive: true, role: true, passwordChangedAt: true } });
      if (!admin?.isActive) throw unauthorized();
      // Tokens signed before the latest password change/reset are void.
      if ((claims.pv ?? 0) !== (admin.passwordChangedAt?.getTime() ?? 0)) throw unauthorized('Session ended, please sign in again');
      if (admin.role !== 'SUPER_ADMIN' && roles.length && !roles.includes(admin.role)) throw forbidden();
      req.admin = { id: claims.sub, role: admin.role };
      next();
    } catch (e) {
      next(e);
    }
  };
}
