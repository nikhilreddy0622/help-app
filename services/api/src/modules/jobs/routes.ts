import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { JobPostingSchema, JobPostingUpdateSchema, JobSearchSchema, JobStatusUpdateSchema, lat, lng } from '@help/validation';
import { env } from '../../config/env';
import { AppError, ah, created, forbidden, notFound, ok, parse } from '../../lib/http';
import { prisma } from '../../lib/core';
import { requireUser } from '../../middleware/auth';
import { createJob, deleteJob, getJob, myJobs, searchJobs, setJobStatus, updateJob } from './service';

export const jobsRouter = Router();

// ---------- self-management (must precede /:id) ----------
const me = Router();
me.use(requireUser);
me.get('/', ah(async (req, res) => ok(res, await myJobs(req.user!.id))));
me.post('/', ah(async (req, res) => created(res, await createJob(req.user!.id, parse(JobPostingSchema, req.body)))));
me.patch('/:id', ah(async (req, res) => ok(res, await updateJob(req.user!.id, String(req.params.id), parse(JobPostingUpdateSchema, req.body)))));
me.put('/:id/status', ah(async (req, res) => ok(res, await setJobStatus(req.user!.id, String(req.params.id), parse(JobStatusUpdateSchema, req.body).status))));
me.delete('/:id', ah(async (req, res) => { await deleteJob(req.user!.id, String(req.params.id)); res.status(204).end(); }));
jobsRouter.use('/me', me);

// ---------- public ----------
jobsRouter.get('/', ah(async (req, res) => {
  const q = parse(JobSearchSchema.extend({ lat, lng }), req.query);
  const { items, nextCursor } = await searchJobs(q);
  ok(res, items, { nextCursor });
}));

jobsRouter.get('/:id', ah(async (req, res) => ok(res, await getJob(String(req.params.id)))));

const revealLimiter = rateLimit({
  windowMs: 86_400_000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? 'anon',
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ data: null, error: { code: 'PHONE_REVEAL_LIMIT', message: 'Daily phone reveal limit reached' } }),
});

/** Full extent of the app's involvement in hiring: reveal the provider's phone. No applications, chat or resume upload. */
jobsRouter.post('/:id/reveal-phone', requireUser, revealLimiter, ah(async (req, res) => {
  const job = await prisma.jobPosting.findFirst({
    where: { id: String(req.params.id), deletedAt: null },
    select: { id: true, providerId: true, provider: { select: { userId: true, showPhone: true, user: { select: { phone: true } } } } },
  });
  if (!job) throw notFound('Job posting');
  if (job.provider.userId === req.user!.id) throw forbidden('This is your own job posting');
  if (!job.provider.showPhone || !job.provider.user.phone) throw new AppError(403, 'PHONE_HIDDEN', 'The poster has hidden their phone number');
  await prisma.contactEvent.create({ data: { providerId: job.providerId, userId: req.user!.id, kind: 'JOB_CONTACT_REVEALED' } });
  ok(res, { phone: job.provider.user.phone });
}));
