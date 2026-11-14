import { Router } from 'express';
import { CreateReportSchema } from '@help/validation';
import { prisma } from '../../lib/core';
import { AppError, ah, created, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';

export const reportsRouter = Router();

reportsRouter.post('/', requireUser, ah(async (req, res) => {
  const b = parse(CreateReportSchema, req.body);
  const userId = req.user!.id;
  const dup = await prisma.report.findFirst({ where: { reporterId: userId, targetType: b.targetType, targetId: b.targetId, status: { in: ['OPEN', 'IN_REVIEW'] } }, select: { id: true } });
  if (dup) return created(res, { id: dup.id });
  if ((await prisma.report.count({ where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } })) >= 20) {
    throw new AppError(429, 'REPORT_LIMIT', 'Daily report limit reached');
  }
  const r = await prisma.report.create({ data: { reporterId: userId, targetType: b.targetType, targetId: b.targetId, reason: b.reason, details: b.details } });
  created(res, { id: r.id });
}));
