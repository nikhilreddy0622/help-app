/**
 * Provider presence (directory model). Providers set a manual status with an
 * optional message and "until" time; a paused profile is hidden entirely.
 * This is the ONLY place that decides what customers see.
 */
import { isAvailableAt, type AvailabilityException, type WeeklyRule } from './misc';

export const PRESENCE_STATUSES = ['AVAILABLE', 'BUSY', 'AWAY'] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export interface PresenceInput {
  status: PresenceStatus;
  statusMessage: string | null;
  /** When BUSY/AWAY ends; null = until changed manually. */
  statusUntil: Date | null;
  statusUpdatedAt: Date | null;
  isPaused: boolean;
  timezone: string;
  /** Optional working hours; empty = no hours restriction. */
  rules: WeeklyRule[];
  exceptions: AvailabilityException[];
}

export interface Presence {
  status: PresenceStatus;
  /** Contactable right now: AVAILABLE and inside working hours (if hours are set). */
  availableNow: boolean;
  /** Short label for cards, e.g. "Available now", "Busy · back 6:00 PM", "Away until Mon 18 Nov". */
  label: string;
  message: string | null;
  until: Date | null;
  /** Status confirmed within the last 24h — shown as "Updated 2h ago" and used in ranking. */
  fresh: boolean;
  visible: boolean;
}

export const STATUS_FRESH_HOURS = 24;
export const STATUS_MESSAGE_MAX = 80;

export function effectivePresence(p: PresenceInput, now: Date): Presence {
  // Busy/Away with an end time auto-returns to Available once it passes.
  const expired = p.status !== 'AVAILABLE' && p.statusUntil !== null && p.statusUntil.getTime() <= now.getTime();
  const status: PresenceStatus = expired ? 'AVAILABLE' : p.status;
  const message = expired ? null : p.statusMessage;
  const until = expired ? null : p.statusUntil;
  const inHours = p.rules.length === 0
    ? !p.exceptions.some((e) => now >= e.startsAt && now < e.endsAt)
    : isAvailableAt({ now, timezone: p.timezone, rules: p.rules, exceptions: p.exceptions });
  const availableNow = !p.isPaused && status === 'AVAILABLE' && inHours;
  const fresh = !!p.statusUpdatedAt && now.getTime() - p.statusUpdatedAt.getTime() <= STATUS_FRESH_HOURS * 3_600_000;
  return { status, availableNow, label: presenceLabel(status, availableNow, until, p.timezone, now), message, until, fresh, visible: !p.isPaused };
}

function presenceLabel(status: PresenceStatus, availableNow: boolean, until: Date | null, tz: string, now: Date): string {
  if (status === 'AVAILABLE') return availableNow ? 'Available now' : 'Outside working hours';
  const word = status === 'BUSY' ? 'Busy' : 'Away';
  if (!until) return word;
  const sameDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(until) === new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  const when = sameDay
    ? new Intl.DateTimeFormat('en-IN', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(until)
    : new Intl.DateTimeFormat('en-IN', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(until);
  return status === 'BUSY' ? `${word} · back ${when}` : `${word} until ${when}`;
}

/** "Updated 2h ago" style text for status freshness. */
export function updatedAgo(updatedAt: Date | null, now: Date): string | null {
  if (!updatedAt) return null;
  const mins = Math.max(0, Math.round((now.getTime() - updatedAt.getTime()) / 60_000));
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `Updated ${days}d ago`;
}

/**
 * Directory-model review rule: a customer may review a provider once, and only
 * after a real interaction — a conversation in which the provider replied.
 */
export function canReviewProvider(args: { isSelf: boolean; providerReplied: boolean; alreadyReviewed: boolean }): { ok: boolean; reason?: 'SELF' | 'NO_INTERACTION' | 'ALREADY_REVIEWED' } {
  if (args.isSelf) return { ok: false, reason: 'SELF' };
  if (args.alreadyReviewed) return { ok: false, reason: 'ALREADY_REVIEWED' };
  if (!args.providerReplied) return { ok: false, reason: 'NO_INTERACTION' };
  return { ok: true };
}

/** Auto-reply text sent once per conversation per status period when provider is BUSY/AWAY. */
export function defaultAutoReply(status: PresenceStatus, message: string | null): string | null {
  if (status === 'AVAILABLE') return null;
  if (message) return message;
  return status === 'BUSY' ? "I'm busy right now and will reply as soon as I can." : "I'm away at the moment and will reply when I'm back.";
}
