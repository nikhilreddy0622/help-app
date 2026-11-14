import type { ReactNode } from 'react';
import { Award, BadgeCheck, Smartphone, ShieldCheck, Star } from 'lucide-react';
import type { VerificationBadges } from '@help/types';
import { initials } from '../../lib/format';

export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const s = { width: size, height: size, fontSize: Math.max(12, size / 3) };
  return src ? (
    <img src={src} alt="" style={s} className="flex-none rounded-full object-cover" loading="lazy" />
  ) : (
    <span aria-hidden style={s} className="flex flex-none items-center justify-center rounded-full bg-[#E0F2F1] font-bold text-teal-700">{initials(name)}</span>
  );
}

export function Stars({ value, count, size = 'md' }: { value: number | null; count?: number; size?: 'sm' | 'md' }) {
  if (value === null || count === 0) return <span className="rounded-md bg-info-bg px-2 py-0.5 text-xs font-semibold text-info-fg">New</span>;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-navy ${size === 'sm' ? 'text-sm' : 'text-base'}`} aria-label={`Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ''}`}>
      <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />{value.toFixed(1)}
      {count !== undefined && <span className="font-normal text-muted">({count})</span>}
    </span>
  );
}

const pill = 'inline-flex h-7 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs font-medium text-ink';
/** Three visually distinct verification levels: mobile, ID, qualification. */
export function VerificationBadgeRow({ badges, qualification }: { badges: VerificationBadges; qualification?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.mobile && <span className={pill}><Smartphone className="h-3.5 w-3.5 text-muted" aria-hidden />Mobile verified</span>}
      {badges.identity && <span className={pill}><ShieldCheck className="h-3.5 w-3.5 text-teal" aria-hidden />ID verified</span>}
      {badges.qualification && <span className={pill}><Award className="h-3.5 w-3.5 text-navy" aria-hidden />{qualification ?? 'Qualification verified'}</span>}
    </div>
  );
}
export const VerifiedMark = () => <BadgeCheck className="h-4 w-4 text-teal" aria-label="Verified" />;

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  const t = { neutral: 'bg-surface text-subtle', success: 'bg-success-bg text-success-fg', warning: 'bg-warning-bg text-warning-fg', danger: 'bg-danger-bg text-danger', info: 'bg-info-bg text-info-fg' }[tone];
  return <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ${t}`}>{children}</span>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight">{children}</h2>{action}</div>;
}
