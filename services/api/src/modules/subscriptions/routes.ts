import { Router } from 'express';
import { CreateSubscriptionSchema, VerifySubscriptionSchema } from '@help/validation';
import { ah, created, ok, parse } from '../../lib/http';
import { requireUser } from '../../middleware/auth';
import { cancelMySubscription, createCheckout, getMySubscription, listPlans, paymentHistory, verifyCheckout } from './service';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/plans', ah(async (_req, res) => ok(res, await listPlans())));
subscriptionsRouter.get('/me', requireUser, ah(async (req, res) => ok(res, await getMySubscription(req.user!.id))));
subscriptionsRouter.post('/checkout', requireUser, ah(async (req, res) => {
  const { planId } = parse(CreateSubscriptionSchema, req.body);
  created(res, await createCheckout(req.user!.id, planId));
}));
subscriptionsRouter.post('/verify', requireUser, ah(async (req, res) => {
  ok(res, await verifyCheckout(req.user!.id, parse(VerifySubscriptionSchema, req.body)));
}));
subscriptionsRouter.post('/cancel', requireUser, ah(async (req, res) => ok(res, await cancelMySubscription(req.user!.id))));

export const paymentsRouter = Router();
paymentsRouter.get('/me', requireUser, ah(async (req, res) => ok(res, await paymentHistory(req.user!.id))));
