import { Link } from 'react-router-dom';
import { MARK_PARTS } from '@help/ui-tokens';

/** The help mark (navy tile, white h, teal dot). */
export function Mark({ size = 32, dotClass }: { size?: number; dotClass?: string }) {
  const m = MARK_PARTS;
  return (
    <svg width={size} height={size} viewBox={m.viewBox} aria-hidden focusable="false" className="flex-none">
      <rect width="512" height="512" rx={m.bg.rx} fill={m.bg.fill} />
      <path d={m.h.d} fill="none" stroke={m.h.stroke} strokeWidth={m.h.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle className={dotClass} cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} fill={m.dot.fill} />
    </svg>
  );
}

/** Wordmark: "help" Inter Bold navy + teal dot. */
export function Wordmark({ className = 'text-2xl' }: { className?: string }) {
  return <span className={`font-bold tracking-tight text-navy ${className}`}>help<span className="text-teal">.</span></span>;
}

export function Logo({ to = '/', size = 32, textClass = 'text-2xl' }: { to?: string | null; size?: number; textClass?: string }) {
  const inner = <><Mark size={size} /><Wordmark className={textClass} /></>;
  if (!to) return <span className="inline-flex items-center gap-2">{inner}</span>;
  return <Link to={to} aria-label="help home" className="inline-flex items-center gap-2" style={{ color: '#172B4D' }}>{inner}</Link>;
}

/** Full-page / route-level loader: only the teal dot fades. Lists use skeletons instead. */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-[50vh] items-center justify-center">
      <Mark size={64} dotClass="brand-dot" />
    </div>
  );
}
