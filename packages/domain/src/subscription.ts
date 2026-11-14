/**
 * Subscription lifecycle (PRD §14–15). Backend is the source of truth;
 * these pure functions decide status changes from Razorpay events and
 * whether a provider is discoverable.
 */
export const SUBSCRIPTION_STATUSES = [
  'INCOMPLETE',
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
  'HALTED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses that count as "the provider has a live subscription" (one allowed at a time). */
export const LIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ['PENDING', 'ACTIVE', 'PAST_DUE'];

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  /** End of the period already paid for. */
  currentPeriodEnd: Date | null;
  /** When the subscription first went PAST_DUE (start of grace). */
  pastDueSince: Date | null;
}

/**
 * Is the provider entitled to be publicly discoverable and receive new enquiries?
 * - ACTIVE: yes while paid period not over (small clock-skew tolerance handled by webhook timing).
 * - PAST_DUE: yes during the grace period.
 * - CANCELLED: yes until the paid-through date (cancellation stops renewals only).
 * - anything else: no.
 */
export function isEntitled(sub: SubscriptionSnapshot | null, now: Date, graceDays: number): boolean {
  if (!sub) return false;
  const paidThrough = sub.currentPeriodEnd?.getTime() ?? 0;
  switch (sub.status) {
    case 'ACTIVE':
      // Renewal webhooks may arrive a little after period end; allow the grace window here too.
      return now.getTime() <= paidThrough + days(graceDays);
    case 'PAST_DUE': {
      const since = sub.pastDueSince?.getTime() ?? paidThrough;
      return now.getTime() <= since + days(graceDays);
    }
    case 'CANCELLED':
      return now.getTime() <= paidThrough;
    default:
      return false;
  }
}

const days = (n: number) => n * 24 * 60 * 60 * 1000;

/** Razorpay subscription webhook events we act on. */
export type RazorpaySubEvent =
  | 'subscription.authenticated'
  | 'subscription.activated'
  | 'subscription.charged'
  | 'subscription.pending'
  | 'subscription.halted'
  | 'subscription.cancelled'
  | 'subscription.completed'
  | 'subscription.paused'
  | 'subscription.resumed';

/**
 * Next status for an incoming Razorpay event. Returns null when the event
 * should not change status (e.g. stale/out-of-order event on a terminal sub).
 */
export function nextSubscriptionStatus(current: SubscriptionStatus, event: RazorpaySubEvent): SubscriptionStatus | null {
  const terminal: SubscriptionStatus[] = ['EXPIRED'];
  if (terminal.includes(current)) return null;
  switch (event) {
    case 'subscription.authenticated':
      return current === 'INCOMPLETE' ? 'PENDING' : null;
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      // A cancelled sub never re-activates from a late charge event.
      return current === 'CANCELLED' ? null : 'ACTIVE';
    case 'subscription.pending':
      return current === 'ACTIVE' || current === 'PENDING' ? 'PAST_DUE' : null;
    case 'subscription.halted':
      return 'HALTED';
    case 'subscription.paused':
      return 'HALTED';
    case 'subscription.cancelled':
      return 'CANCELLED';
    case 'subscription.completed':
      return 'EXPIRED';
    default:
      return null;
  }
}
