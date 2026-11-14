import { Router } from 'express';
import type { AvailabilityDto } from '@help/api-client';
import { AvailabilityExceptionSchema, AvailabilitySchema } from '@help/validation';
import { prisma } from '../../lib/core';
import { ah, badRequest, notFound, ok, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { presenceOf, freshCardInclude } from '../providers/cards';
import { recompute, requireOwnProvider } from '../providers/service';

export const availabilityRouter = Router();
availabilityRouter.use(requireUser);

async function dto(providerId: string): Promise<AvailabilityDto> {
  const now = new Date();
  const p = await prisma.providerProfile.findUniqueOrThrow({
    where: { id: providerId },
    include: { ...freshCardInclude(now), exceptions: { where: { endsAt: { gt: now } }, orderBy: { startsAt: 'asc' } } },
  });
  const av = presenceOf(p, now);
  return {
    timezone: p.timezone,
    appointmentOnly: p.appointmentOnly,
    availableNow: av.availableNow,
    rules: p.availability.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
    exceptions: p.exceptions.map((e) => ({ id: e.id, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString(), reason: e.reason })),
  };
}

availabilityRouter.get('/me', ah(async (req, res) => ok(res, await dto((await requireOwnProvider(req.user!.id)).id))));

availabilityRouter.put('/me', ah(async (req, res) => {
  const b = parse(AvailabilitySchema, req.body);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: b.timezone });
  } catch {
    throw badRequest('Unknown timezone');
  }
  const p = await requireOwnProvider(req.user!.id);
  await prisma.$transaction([
    prisma.availabilityRule.deleteMany({ where: { providerId: p.id } }),
    prisma.availabilityRule.createMany({ data: b.rules.map((r) => ({ ...r, providerId: p.id })) }),
    prisma.providerProfile.update({ where: { id: p.id }, data: { timezone: b.timezone, appointmentOnly: b.appointmentOnly } }),
  ]);
  await recompute(p.id);
  ok(res, await dto(p.id));
}));

availabilityRouter.post('/me/exceptions', ah(async (req, res) => {
  const b = parse(AvailabilityExceptionSchema, req.body);
  const p = await requireOwnProvider(req.user!.id);
  await prisma.availabilityException.create({ data: { ...b, providerId: p.id } });
  ok(res, await dto(p.id));
}));

availabilityRouter.delete('/me/exceptions/:id', ah(async (req, res) => {
  const p = await requireOwnProvider(req.user!.id);
  const { count } = await prisma.availabilityException.deleteMany({ where: { id: String(req.params.id), providerId: p.id } });
  if (!count) throw notFound('Exception');
  ok(res, await dto(p.id));
}));
