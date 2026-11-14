import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  EmailOtpRequestSchema,
  EmailOtpVerifySchema,
  GoogleLoginSchema,
  LinkEmailSchema,
  LinkGoogleSchema,
  LinkPhoneSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  RefreshSchema,
} from '@help/validation';
import { env } from '../../config/env';
import { prisma } from '../../lib/core';
import { ah, notFound, ok, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { requestOtp, verifyOtp } from './otp';
import { getMe, linkEmail, linkGoogle, linkPhone, upsertEmailUser, upsertGoogleUser, upsertPhoneUser, verifyGoogleIdToken } from './service';
import { issueSession, rotateRefresh } from './tokens';

export const authRouter = Router();

const strict = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.NODE_ENV === 'test' });
const meta = (req: import('express').Request, platform: string, deviceName?: string) => ({
  platform,
  deviceName,
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

authRouter.post('/otp/request', strict, ah(async (req, res) => {
  const { phone } = parse(OtpRequestSchema, req.body);
  ok(res, await requestOtp(phone));
}));

authRouter.post('/otp/verify', strict, ah(async (req, res) => {
  const body = parse(OtpVerifySchema, req.body);
  await verifyOtp(body.phone, body.code);
  const userId = await upsertPhoneUser(body.phone);
  const tokens = await issueSession(userId, meta(req, body.platform, body.deviceName));
  ok(res, { tokens, me: await getMe(userId) });
}));

authRouter.post('/email/request', strict, ah(async (req, res) => {
  const { email } = parse(EmailOtpRequestSchema, req.body);
  ok(res, await requestOtp(email, 'EMAIL'));
}));

authRouter.post('/email/verify', strict, ah(async (req, res) => {
  const body = parse(EmailOtpVerifySchema, req.body);
  await verifyOtp(body.email, body.code);
  const userId = await upsertEmailUser(body.email);
  const tokens = await issueSession(userId, meta(req, body.platform, body.deviceName));
  ok(res, { tokens, me: await getMe(userId) });
}));

authRouter.post('/link/email', requireUser, strict, ah(async (req, res) => {
  const { email, code } = parse(LinkEmailSchema, req.body);
  await verifyOtp(email, code);
  await linkEmail(req.user!.id, email);
  ok(res, await getMe(req.user!.id));
}));

authRouter.post('/google', strict, ah(async (req, res) => {
  const body = parse(GoogleLoginSchema, req.body);
  const profile = await verifyGoogleIdToken(body.idToken);
  const userId = await upsertGoogleUser(profile);
  const tokens = await issueSession(userId, meta(req, body.platform, body.deviceName));
  ok(res, { tokens, me: await getMe(userId) });
}));

authRouter.post('/refresh', strict, ah(async (req, res) => {
  const { refreshToken } = parse(RefreshSchema, req.body);
  ok(res, await rotateRefresh(refreshToken, meta(req, 'unknown')));
}));

authRouter.get('/me', requireUser, ah(async (req, res) => ok(res, await getMe(req.user!.id))));

authRouter.post('/link/phone', requireUser, strict, ah(async (req, res) => {
  const { phone, code } = parse(LinkPhoneSchema, req.body);
  await verifyOtp(phone, code);
  await linkPhone(req.user!.id, phone);
  ok(res, await getMe(req.user!.id));
}));

authRouter.post('/link/google', requireUser, strict, ah(async (req, res) => {
  const { idToken } = parse(LinkGoogleSchema, req.body);
  await linkGoogle(req.user!.id, await verifyGoogleIdToken(idToken));
  ok(res, await getMe(req.user!.id));
}));

/** Devices list for "log out of other devices". */
authRouter.get('/sessions', requireUser, ah(async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, deviceName: true, platform: true, lastUsedAt: true, createdAt: true },
    orderBy: { lastUsedAt: 'desc' },
  });
  ok(res, sessions.map((s) => ({ ...s, current: s.id === req.user!.sessionId })));
}));

authRouter.delete('/sessions/:id', requireUser, ah(async (req, res) => {
  const { count } = await prisma.session.updateMany({ where: { id: String(req.params.id), userId: req.user!.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!count) throw notFound('Session');
  ok(res, { revoked: true });
}));

authRouter.post('/logout', requireUser, ah(async (req, res) => {
  await prisma.session.update({ where: { id: req.user!.sessionId }, data: { revokedAt: new Date() } });
  ok(res, { loggedOut: true });
}));
