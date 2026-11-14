import type { Request, Response } from 'express';
import type { RazorpaySubEvent } from '@help/domain';
import { Prisma } from '@prisma/client';
import { logger, prisma } from '../../lib/core';
import { handleSubscriptionEvent, recordPayment } from './service';
import { verifyWebhookSignature } from './razorpay';

/**
 * POST /api/v1/payments/webhooks/razorpay — mounted with express.raw() so the
 * signature is checked over the exact bytes Razorpay sent.
 * Idempotent: the event id is stored with a unique constraint before processing.
 */
export async function razorpayWebhook(req: Request, res: Response) {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) {
    logger.warn({ ip: req.ip }, 'razorpay webhook signature rejected');
    return res.status(400).json({ data: null, error: { code: 'BAD_SIGNATURE', message: 'Invalid signature' } });
  }
  const eventId = req.get('x-razorpay-event-id');
  const payload = JSON.parse(raw.toString('utf8')) as {
    event: string;
    payload: { subscription?: { entity: { id: string; status: string; current_start?: number; current_end?: number } }; payment?: { entity: { id: string; amount: number; status: string; method?: string; invoice_id?: string; error_description?: string; created_at?: number; notes?: Record<string, string> } } };
  };
  if (!eventId) return res.status(400).json({ data: null, error: { code: 'NO_EVENT_ID', message: 'Missing event id' } });

  let record;
  try {
    record = await prisma.webhookEvent.create({ data: { source: 'razorpay', eventId, type: payload.event, payload: payload as unknown as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existing = await prisma.webhookEvent.findUnique({ where: { source_eventId: { source: 'razorpay', eventId } } });
      if (existing?.processedAt) return res.json({ data: { duplicate: true }, error: null });
      record = existing!; // previously failed — retry processing
    } else throw e;
  }

  try {
    const sub = payload.payload.subscription?.entity;
    const pay = payload.payload.payment?.entity;
    if (payload.event.startsWith('subscription.') && sub) {
      await handleSubscriptionEvent(payload.event as RazorpaySubEvent, sub, pay, eventId);
    } else if (payload.event === 'payment.failed' && pay) {
      // Recurring payment failures arrive as payment.failed with the subscription in notes/invoice.
      const subId = pay.notes?.subscription_id;
      const local = subId ? await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: subId } }) : null;
      if (local) await recordPayment(local.id, pay);
    }
    await prisma.webhookEvent.update({ where: { id: record.id }, data: { processedAt: new Date(), error: null } });
    res.json({ data: { received: true }, error: null });
  } catch (e) {
    logger.error({ err: e, eventId }, 'razorpay webhook processing failed');
    await prisma.webhookEvent.update({ where: { id: record.id }, data: { error: String(e).slice(0, 500) } });
    // 500 → Razorpay retries; our dedupe makes retries safe.
    res.status(500).json({ data: null, error: { code: 'PROCESSING_FAILED', message: 'Retry later' } });
  }
}
