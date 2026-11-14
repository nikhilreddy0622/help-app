import { describe, expect, it } from 'vitest';
import {
  bayesianRating,
  canReviewProvider,
  defaultAutoReply,
  effectivePresence,
  isAvailableAt,
  isEntitled,
  nextSubscriptionStatus,
  rankScore,
  slugify,
  updatedAgo,
  type PresenceInput,
} from './index';

const day = 86_400_000;
// 2026-11-14 is a Saturday; 10:00Z = 15:30 IST
const now = new Date('2026-11-14T10:00:00Z');
const base: PresenceInput = {
  status: 'AVAILABLE', statusMessage: null, statusUntil: null, statusUpdatedAt: new Date(now.getTime() - 3_600_000),
  isPaused: false, timezone: 'Asia/Kolkata', rules: [], exceptions: [],
};

describe('presence', () => {
  it('available with no hours set is available now and fresh', () => {
    const p = effectivePresence(base, now);
    expect(p).toMatchObject({ status: 'AVAILABLE', availableNow: true, label: 'Available now', fresh: true, visible: true });
  });
  it('paused profile is invisible and never available', () => {
    const p = effectivePresence({ ...base, isPaused: true }, now);
    expect(p.visible).toBe(false);
    expect(p.availableNow).toBe(false);
  });
  it('away with future date shows message and until label', () => {
    const p = effectivePresence({ ...base, status: 'AWAY', statusMessage: 'Available from Monday', statusUntil: new Date('2026-11-16T03:30:00Z') }, now);
    expect(p.status).toBe('AWAY');
    expect(p.availableNow).toBe(false);
    expect(p.message).toBe('Available from Monday');
    expect(p.label).toMatch(/^Away until Mon/);
  });
  it('busy/away auto-returns to available after until passes', () => {
    const p = effectivePresence({ ...base, status: 'BUSY', statusMessage: 'On a job', statusUntil: new Date(now.getTime() - 1000) }, now);
    expect(p).toMatchObject({ status: 'AVAILABLE', availableNow: true, message: null });
  });
  it('respects working hours when set', () => {
    const rules = [{ weekday: 6, startMinute: 9 * 60, endMinute: 12 * 60 }];
    const p = effectivePresence({ ...base, rules }, now); // 15:30 IST, outside 9–12
    expect(p.availableNow).toBe(false);
    expect(p.label).toBe('Outside working hours');
  });
  it('stale status is not fresh', () => {
    expect(effectivePresence({ ...base, statusUpdatedAt: new Date(now.getTime() - 3 * day) }, now).fresh).toBe(false);
    expect(updatedAgo(new Date(now.getTime() - 2 * 3_600_000), now)).toBe('Updated 2h ago');
  });
  it('auto-reply only when not available', () => {
    expect(defaultAutoReply('AVAILABLE', null)).toBeNull();
    expect(defaultAutoReply('AWAY', 'Back on Monday')).toBe('Back on Monday');
    expect(defaultAutoReply('BUSY', null)).toMatch(/busy/i);
  });
});

describe('reviews (directory model)', () => {
  it('requires a real interaction and allows one review', () => {
    expect(canReviewProvider({ isSelf: false, providerReplied: true, alreadyReviewed: false }).ok).toBe(true);
    expect(canReviewProvider({ isSelf: false, providerReplied: false, alreadyReviewed: false }).reason).toBe('NO_INTERACTION');
    expect(canReviewProvider({ isSelf: false, providerReplied: true, alreadyReviewed: true }).reason).toBe('ALREADY_REVIEWED');
    expect(canReviewProvider({ isSelf: true, providerReplied: true, alreadyReviewed: false }).reason).toBe('SELF');
  });
});

describe('subscription entitlement', () => {
  it('active within period is entitled', () => {
    expect(isEntitled({ status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() + day), pastDueSince: null }, now, 3)).toBe(true);
  });
  it('past due is entitled only during grace', () => {
    const sub = { status: 'PAST_DUE' as const, currentPeriodEnd: null, pastDueSince: new Date(now.getTime() - 2 * day) };
    expect(isEntitled(sub, now, 3)).toBe(true);
    expect(isEntitled({ ...sub, pastDueSince: new Date(now.getTime() - 4 * day) }, now, 3)).toBe(false);
  });
  it('cancelled keeps access until paid-through date', () => {
    expect(isEntitled({ status: 'CANCELLED', currentPeriodEnd: new Date(now.getTime() + day), pastDueSince: null }, now, 3)).toBe(true);
    expect(isEntitled({ status: 'CANCELLED', currentPeriodEnd: new Date(now.getTime() - 1), pastDueSince: null }, now, 3)).toBe(false);
  });
  it('late charge event does not revive a cancelled subscription', () => {
    expect(nextSubscriptionStatus('CANCELLED', 'subscription.charged')).toBeNull();
    expect(nextSubscriptionStatus('PENDING', 'subscription.activated')).toBe('ACTIVE');
    expect(nextSubscriptionStatus('EXPIRED', 'subscription.activated')).toBeNull();
  });
});

describe('ranking', () => {
  it('new providers get the prior, not zero', () => {
    expect(bayesianRating(null, 0)).toBeCloseTo(4.2);
  });
  it('closer + available + fresh ranks higher', () => {
    const b = { relevance: 0.8, radiusKm: 10, ratingAvg: 4.5, ratingCount: 20, completeness: 0.8, verificationLevel: 2, responseMinutes: 30 };
    expect(rankScore({ ...b, distanceKm: 1, availableNow: true, statusFresh: true })).toBeGreaterThan(rankScore({ ...b, distanceKm: 8, availableNow: false, statusFresh: false }));
  });
});

describe('misc rules', () => {
  it('slugifies names', () => {
    expect(slugify('Rahul Kumar', 'Electrician')).toBe('rahul-kumar-electrician');
  });
  it('working hours respect provider timezone', () => {
    const rules = [{ weekday: 6, startMinute: 9 * 60, endMinute: 19 * 60 }];
    expect(isAvailableAt({ now, timezone: 'Asia/Kolkata', rules, exceptions: [] })).toBe(true);
    expect(isAvailableAt({ now, timezone: 'America/New_York', rules, exceptions: [] })).toBe(false);
  });
});
