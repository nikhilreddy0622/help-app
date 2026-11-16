import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { CreateLiveRequestSchema, LiveRespondSchema, LiveRequestSettingsSchema, lat, lng } from '@help/validation';
import { env } from '../../config/env';
import { ah, created, ok, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import {
  cancelLiveRequest, connectToResponder, createLiveRequest, getLiveRequest, getLiveSettings,
  incomingForProvider, myActiveRequest, respondToRequest, setLiveSettings, withdrawResponse,
} from './service';

export const liveRequestsRouter = Router();
liveRequestsRouter.use(requireUser);

const createLimiter = rateLimit({
  windowMs: 60_000, limit: 5, keyGenerator: (req) => req.user?.id ?? 'anon',
  skip: () => env.NODE_ENV === 'test', standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down a moment.' } }),
});

// ---- provider: settings + incoming (declared before /:id) ----
liveRequestsRouter.get('/settings', ah(async (req, res) => ok(res, await getLiveSettings(req.user!.id))));
liveRequestsRouter.put('/settings', ah(async (req, res) => ok(res, await setLiveSettings(req.user!.id, parse(LiveRequestSettingsSchema, req.body)))));
liveRequestsRouter.get('/incoming', ah(async (req, res) => {
  const q = parse(z.object({ lat: lat.optional(), lng: lng.optional() }), req.query);
  ok(res, await incomingForProvider(req.user!.id, q));
}));
liveRequestsRouter.post('/:id/respond', ah(async (req, res) => ok(res, await respondToRequest(req.user!.id, String(req.params.id), parse(LiveRespondSchema, req.body)))));
liveRequestsRouter.post('/:id/withdraw', ah(async (req, res) => ok(res, await withdrawResponse(req.user!.id, String(req.params.id)))));

// ---- customer ----
liveRequestsRouter.get('/mine', ah(async (req, res) => ok(res, await myActiveRequest(req.user!.id))));
liveRequestsRouter.post('/', createLimiter, ah(async (req, res) => created(res, await createLiveRequest(req.user!.id, parse(CreateLiveRequestSchema, req.body)))));
liveRequestsRouter.get('/:id', ah(async (req, res) => ok(res, await getLiveRequest(req.user!.id, String(req.params.id)))));
liveRequestsRouter.post('/:id/cancel', ah(async (req, res) => ok(res, await cancelLiveRequest(req.user!.id, String(req.params.id)))));
liveRequestsRouter.post('/:id/connect/:providerId', ah(async (req, res) => ok(res, await connectToResponder(req.user!.id, String(req.params.id), String(req.params.providerId)))));
