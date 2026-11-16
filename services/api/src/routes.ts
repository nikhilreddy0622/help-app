import { Router } from 'express';
import { adminRouter } from './modules/admin/routes';
import { authRouter } from './modules/auth/routes';
import { availabilityRouter } from './modules/availability/routes';
import { conversationsRouter } from './modules/conversations/routes';
import { categoriesRouter, discoveryRouter } from './modules/discovery/routes';
import { jobsRouter } from './modules/jobs/routes';
import { liveRequestsRouter } from './modules/liveRequests/routes';
import { mediaRouter } from './modules/media/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { providersRouter } from './modules/providers/routes';
import { reportsRouter } from './modules/reports/routes';
import { reviewsRouter } from './modules/reviews/routes';
import { supportRouter } from './modules/support/routes';
import { paymentsRouter, subscriptionsRouter } from './modules/subscriptions/routes';
import { usersRouter } from './modules/users/routes';

/** /api/v1 router. Each domain module owns its router. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/discovery', discoveryRouter);
apiRouter.use('/providers', providersRouter);
apiRouter.use('/jobs', jobsRouter);
apiRouter.use('/live-requests', liveRequestsRouter);
apiRouter.use('/availability', availabilityRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/conversations', conversationsRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/support', supportRouter);
apiRouter.use('/admin', adminRouter);
