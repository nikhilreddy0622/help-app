import cors from 'cors';
import { LOCAL_UPLOAD_DIR } from './modules/media/routes';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { Prisma } from '@prisma/client';
import { env, isProd } from './config/env';
import { logger, prisma } from './lib/core';
import { AppError, ah } from './lib/http';
import { apiRouter } from './routes';
import { razorpayWebhook } from './modules/subscriptions/webhook';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render terminates TLS at its proxy

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: false }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Webhook needs the raw body for signature verification — register BEFORE express.json().
  app.post('/api/v1/payments/webhooks/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), ah(razorpayWebhook));

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, skip: (req) => env.NODE_ENV === 'test' || req.path === '/v1/notifications/stream' }));

  app.get('/health', ah(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  }));

  // Dev-only file serving for the local upload fallback (see media/routes.ts).
  if (env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '1d', setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin') }));
  }

  app.use('/api/v1', apiRouter);

  app.use((_req, res) => res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }));

  // Centralised error handler — never leaks internals in production.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ data: null, error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'Already exists' } });
      if (err.code === 'P2025') return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ data: null, error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
    }
    req.log?.error({ err }, 'unhandled error');
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: isProd ? 'Something went wrong' : String(err) } });
  });

  return app;
}
