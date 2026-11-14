/** Small shared rules: slugs, review eligibility, profile completeness, availability. */

export function slugify(...parts: string[]): string {
  return parts
    .join(' ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface CompletenessInput {
  hasPhoto: boolean;
  hasHeadline: boolean;
  bioLength: number;
  skillsCount: number;
  servicesCount: number;
  hasLocation: boolean;
  hasAvailability: boolean;
  portfolioCount: number;
}

export function profileCompleteness(p: CompletenessInput): number {
  const checks = [
    p.hasPhoto,
    p.hasHeadline,
    p.bioLength >= 60,
    p.skillsCount >= 1,
    p.servicesCount >= 1,
    p.hasLocation,
    p.hasAvailability,
    p.portfolioCount >= 1,
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** Minimum fields needed before a profile may be published. */
export function missingForPublish(p: CompletenessInput): string[] {
  const missing: string[] = [];
  if (!p.hasHeadline) missing.push('headline');
  if (p.servicesCount < 1) missing.push('services');
  if (!p.hasLocation) missing.push('location');
  if (!p.hasAvailability) missing.push('availability');
  return missing;
}

export interface WeeklyRule {
  /** 0 = Sunday … 6 = Saturday, in the provider's timezone. */
  weekday: number;
  /** Minutes from midnight, provider local time. */
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityException {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Is the provider available at `now`? Uses the provider's timezone so the
 * answer is correct regardless of the viewer's location. A stale manual
 * "available today" flag only counts if it was set today (PRD §9).
 */
export function isAvailableAt(args: {
  now: Date;
  timezone: string;
  rules: WeeklyRule[];
  exceptions: AvailabilityException[];
  availableTodayOverride?: { value: boolean; setAt: Date } | null;
}): boolean {
  const { now, timezone } = args;
  if (args.exceptions.some((e) => now >= e.startsAt && now < e.endsAt)) return false;
  const local = localParts(now, timezone);
  const override = args.availableTodayOverride;
  if (override && localParts(override.setAt, timezone).dateKey === local.dateKey && !override.value) return false;
  return args.rules.some((r) => r.weekday === local.weekday && local.minute >= r.startMinute && local.minute < r.endMinute);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(d: Date, timeZone: string): { weekday: number; minute: number; dateKey: string } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    weekday: WEEKDAYS.indexOf(parts.weekday ?? 'Sun'),
    minute: Number(parts.hour) * 60 + Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}
