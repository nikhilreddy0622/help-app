import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnread } from '../../state/RealtimeContext';
import { useFocusTrap } from '../ui/Modal';
import { NotificationCenter } from './NotificationCenter';

/** Desktop: bell opens a popover notification centre. Mobile: bell links to the full page. */
export function NotificationBell() {
  const { count } = useUnread();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  const badge = count > 0 && (
    <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white">{count > 99 ? '99+' : count}</span>
  );
  const btn = 'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-navy hover:bg-surface';
  return (
    <>
      <Link to="/notifications" aria-label={label} className={`${btn} md:hidden`}><Bell className="h-5 w-5" />{badge}</Link>
      <div ref={wrap} className="relative hidden md:block">
        <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={btn}><Bell className="h-5 w-5" />{badge}</button>
        {open && (
          <div ref={panel} role="dialog" aria-label="Notifications" tabIndex={-1} className="absolute right-0 top-12 z-50 flex max-h-[80vh] w-[420px] flex-col overflow-hidden rounded-lg border border-line bg-white text-ink shadow-md">
            <NotificationCenter variant="popover" onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
