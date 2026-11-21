import { Router } from 'express';
import { canReviewProvider } from '@help/domain';
import { CreateReviewSchema, ReviewReplySchema } from '@help/validation';
import { Prisma } from '@prisma/client';
import { notifySafe } from '../../integrations/notify';
import { prisma } from '../../lib/core';
import { AppError, ah, conflict, created, notFound, ok, parse } from '../../lib/http';
import { optionalUser, requireUser } from '../../middleware/auth';
import { reviewDto, shortName } from '../providers/cards';

export const reviewsRouter = Router();

/** Keeps denormalised rating fields in sync (VISIBLE reviews only). */
export async function recalcRating(tx: Prisma.TransactionClient, providerId: string) {
  const agg = await tx.review.aggregate({ where: { providerId, status: 'VISIBLE' }, _avg: { overall: true }, _count: { _all: true } });
  await tx.providerProfile.update({
    where: { id: providerId },
    data: { ratingAvg: agg._count._all ? Math.round((agg._avg.overall ?? 0) * 100) / 100 : null, ratingCount: agg._count._all },
  });
}

/** A customer may review once, after contacting the provider (chat or phone reveal). */
async function eligibility(userId: string, providerId: string) {
  const provider = await prisma.providerProfile.findFirst({ where: { id: providerId, deletedAt: null }, select: { id: true, userId: true } });
  if (!provider) throw notFound('Provider');
  const [convo, revealed, existing] = await Promise.all([
    prisma.conversation.findUnique({ where: { customerId_providerId: { customerId: userId, providerId } }, select: { id: true } }),
    prisma.contactEvent.findFirst({ where: { providerId, userId, kind: 'PHONE_REVEALED' }, select: { id: true } }),
    prisma.review.findUnique({ where: { authorId_providerId: { authorId: userId, providerId } }, select: { id: true } }),
  ]);
  const r = canReviewProvider({ isSelf: provider.userId === userId, contacted: !!convo || !!revealed, alreadyReviewed: !!existing });
  return { provider, result: r };
}

reviewsRouter.get('/eligibility/:providerId', optionalUser, ah(async (req, res) => {
  if (!req.user) return ok(res, { canReview: false, reason: 'SIGNED_OUT' });
  const { result } = await eligibility(req.user.id, String(req.params.providerId));
  ok(res, result.ok ? { canReview: true } : { canReview: false, reason: result.reason });
}));

reviewsRouter.use(requireUser);

reviewsRouter.post('/', ah(async (req, res) => {
  const b = parse(CreateReviewSchema, req.body);
  const { provider, result } = await eligibility(req.user!.id, b.providerId);
  if (!result.ok) throw new AppError(409, 'REVIEW_NOT_ALLOWED', 'You can review a professional once, after you have chatted with them or viewed their number', { reason: result.reason });
  const author = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { name: true, avatarUrl: true } });
  let review;
  try {
    review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          providerId: provider.id, authorId: req.user!.id,
          overall: b.overall, quality: b.quality, behaviour: b.behaviour, punctuality: b.punctuality, value: b.value, communication: b.communication, comment: b.comment,
        },
        include: { author: { select: { name: true } } },
      });
      await recalcRating(tx, provider.id);
      return r;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw conflict('You already reviewed this professional', 'REVIEW_NOT_ALLOWED');
    throw e;
  }
  await notifySafe(provider.userId, {
    type: 'REVIEW_RECEIVED',
    category: 'REVIEWS',
    title: `New ${b.overall}-star review`,
    body: `${shortName(author.name)} reviewed you.`,
    link: '/provider/reviews',
    imageUrl: author.avatarUrl,
    data: { reviewId: review.id },
  });
  created(res, reviewDto(review));
}));

reviewsRouter.post('/:id/reply', ah(async (req, res) => {
  const { reply } = parse(ReviewReplySchema, req.body);
  const review = await prisma.review.findUnique({ where: { id: String(req.params.id) }, include: { provider: { select: { userId: true, displayName: true, avatarUrl: true } }, author: { select: { name: true, id: true } } } });
  if (!review || review.provider.userId !== req.user!.id || review.status !== 'VISIBLE') throw notFound('Review');
  const { count } = await prisma.review.updateMany({ where: { id: review.id, reply: null }, data: { reply, repliedAt: new Date() } });
  if (!count) throw conflict('You already replied to this review', 'ALREADY_REPLIED');
  await notifySafe(review.author.id, {
    type: 'REVIEW_REPLY',
    category: 'REVIEWS',
    title: `${review.provider.displayName} replied to your review`,
    body: reply.length > 140 ? `${reply.slice(0, 137)}...` : reply,
    link: `/providers/${review.providerId}`,
    imageUrl: review.provider.avatarUrl,
    data: { reviewId: review.id },
  });
  ok(res, reviewDto({ ...(await prisma.review.findUniqueOrThrow({ where: { id: review.id } })), author: review.author }));
}));
