import { presenceStyle } from '@help/ui-tokens';
import { updatedAgo } from '@help/domain';

type Key = keyof typeof presenceStyle;
const keyOf = (s: string): Key => (s in presenceStyle ? (s as Key) : 'AWAY');

/** Status pill: presenceStyle colours plus the server-built label ("Available now", "Busy · back 6:00 PM"). */
export function PresencePill({ status, label }: { status: string; label: string }) {
  const st = presenceStyle[keyOf(status)];
  return (
    <span style={{ background: st.bg, color: st.fg }} className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold">
      <span aria-hidden style={{ background: st.dot }} className="h-2 w-2 flex-none rounded-full" /><span className="truncate">{label}</span>
    </span>
  );
}

/** Provider note and "Updated 2h ago". */
export function PresenceNote({ message, updatedAt, className = '' }: { message: string | null; updatedAt: string | null; className?: string }) {
  const ago = updatedAt ? updatedAgo(new Date(updatedAt), new Date()) : null;
  if (!message && !ago) return null;
  return (
    <p className={`text-xs text-subtle ${className}`}>
      {message && <span className="text-ink">{message}</span>}{message && ago && ' · '}
      {ago && <span suppressHydrationWarning>{ago}</span>}
    </p>
  );
}
