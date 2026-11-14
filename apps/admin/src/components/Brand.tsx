import { LOADER, MARK_PARTS } from '@help/ui-tokens';

export function Mark({ size = 32, animateDot = false }: { size?: number; animateDot?: boolean }) {
  const m = MARK_PARTS;
  return (
    <svg width={size} height={size} viewBox={m.viewBox} role="img" aria-label="help" className="shrink-0">
      <rect width="512" height="512" rx={m.bg.rx} fill={m.bg.fill} />
      <path d={m.h.d} fill="none" stroke={m.h.stroke} strokeWidth={m.h.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} fill={m.dot.fill} className={animateDot ? 'brand-dot' : undefined} />
    </svg>
  );
}

/** Mark + "help" wordmark with teal dot. `light` = for dark (navy) backgrounds. */
export function Logo({ size = 32, showWord = true, light = false }: { size?: number; showWord?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={size} />
      {showWord && (
        <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`} aria-hidden>
          help<span className="text-teal">.</span>
        </span>
      )}
    </span>
  );
}

/** Full-page loader: only the teal dot fades. */
export function BrandLoader() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-bg">
      <style>{`@keyframes brand-dot{0%,100%{opacity:1}50%{opacity:${LOADER.dotMinOpacity}}}.brand-dot{animation:brand-dot ${LOADER.durationMs}ms ease-in-out infinite}@media (prefers-reduced-motion:reduce){.brand-dot{animation:none}}`}</style>
      <Mark size={72} animateDot />
    </div>
  );
}
