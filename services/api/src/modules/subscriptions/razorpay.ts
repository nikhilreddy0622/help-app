import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { hmacSha256Hex, safeEqual } from '../../lib/core';
import { unavailable } from '../../lib/http';

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw unavailable('Razorpay');
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

/** Checkout handler signature: HMAC(payment_id|subscription_id, key_secret). */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) throw unavailable('Razorpay');
  return safeEqual(hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${paymentId}|${subscriptionId}`), signature);
}

/** Webhook signature over the RAW request body. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw unavailable('Razorpay webhooks');
  if (!signature) return false;
  return safeEqual(hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}

/** Ensure a Razorpay plan exists for a local plan; returns the Razorpay plan id. */
export async function ensureRazorpayPlan(plan: { name: string; interval: 'MONTHLY' | 'YEARLY'; pricePaise: number; razorpayPlanId: string | null }) {
  if (plan.razorpayPlanId) return plan.razorpayPlanId;
  const created = await razorpay().plans.create({
    period: plan.interval === 'MONTHLY' ? 'monthly' : 'yearly',
    interval: 1,
    item: { name: plan.name, amount: plan.pricePaise, currency: 'INR' },
  });
  return created.id;
}
