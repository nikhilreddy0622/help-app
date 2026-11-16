import { formatINR } from '@help/api-client';
import { priceUnitLabel } from '@help/ui-tokens';

export { formatINR };

export function priceLabel(paise: number | null, unit: string | null): string {
  if (paise == null) return 'Ask for price';
  const u = unit ? priceUnitLabel[unit] : undefined;
  if (unit === 'STARTING_AT') return `from ${formatINR(paise)}`;
  return `${formatINR(paise)}${u ? ` ${u.replace(' / ', '/')}` : ''}`;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase();
}

const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function dayBucket(iso: string, now = new Date()): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso);
  if (sameDay(d, now)) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return sameDay(d, y) ? 'Yesterday' : 'Earlier';
}

/** 2m, 3h, Yesterday 4:10 PM, 12 Nov. Device-local time. */
export function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (sameDay(d, now)) return `${Math.floor(mins / 60)}h`;
  if (dayBucket(iso, now) === 'Yesterday') return `Yesterday ${time(d)}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time(d)}`;
}
export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const formatTimeOnly = (iso: string) => time(new Date(iso));

export function minuteLabel(m: number): string {
  const h = Math.floor(m / 60) % 24; const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function distanceLabel(km: number | null): string {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "₹800–1,200/day", "₹500/day", "from ₹500/day", or "Pay on ask". */
export function jobPayLabel(min: number | null, max: number | null, unit: string | null): string {
  const per = unit ? `/${unit}` : '';
  if (min == null && max == null) return 'Pay on ask';
  if (min != null && max != null && min !== max) return `${formatINR(min)}–${formatINR(max).replace('₹', '')}${per}`;
  const one = (min ?? max)!;
  return `${formatINR(one)}${per}`;
}

export const JOB_TYPE_LABEL: Record<string, string> = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', GIG: 'Gig / one-off' };
