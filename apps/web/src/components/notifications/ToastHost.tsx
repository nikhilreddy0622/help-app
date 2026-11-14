import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { NotificationDto } from '@help/types';
import { useRealtime } from '../../state/RealtimeContext';
import { areaOf, mapLink } from '../../lib/links';
import { useApi } from '../../lib/api';
import { NotifIcon } from './NotifIcon';

const MAX_VISIBLE = 3;

function Toast({ n, onClose, onOpen }: { n: NotificationDto; onClose: () => void; onOpen: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(onClose, n.important ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [paused, n.important, onClose]);
  return (
    <div
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className={`animate-slide-in pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-white p-3 shadow-md ${n.important ? 'border-navy border-l-4' : 'border-line'}`}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left">
        <NotifIcon n={n} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy">{n.title}</span>
          <span className="line-clamp-2 text-sm text-subtle">{n.body}</span>
        </span>
      </button>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="rounded-full p-1.5 text-subtle hover:bg-surface"><X className="h-4 w-4" /></button>
    </div>
  );
}

/** Stacked toasts (bottom-right desktop, top on mobile) plus an aria-live region announcing new notifications. */
export function ToastHost() {
  const { onNotification } = useRealtime();
  const api = useApi();
  const nav = useNavigate();
  const loc = useLocation();
  const pathRef = useRef(loc.pathname);
  pathRef.current = loc.pathname;
  const [toasts, setToasts] = useState<NotificationDto[]>([]);
  const [announce, setAnnounce] = useState('');

  const close = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => onNotification((n) => {
    const target = mapLink(n.link, areaOf(pathRef.current), n.data);
    setAnnounce(`New notification: ${n.title}. ${n.body}`);
    if (target && target === pathRef.current) return; // already looking at it
    setToasts((t) => [n, ...t.filter((x) => x.id !== n.id)].slice(0, MAX_VISIBLE));
  }), [onNotification]);

  const open = (n: NotificationDto) => {
    close(n.id);
    void (n.groupKey ? api.notifications.markGroupRead(n.groupKey) : api.notifications.markRead(n.id)).catch(() => undefined);
    const target = mapLink(n.link, areaOf(pathRef.current), n.data);
    if (target) nav(target);
  };

  return (
    <>
      <div className="sr-only-live" role="status" aria-live="polite" aria-atomic="true">{announce}</div>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col gap-2 md:inset-x-auto md:bottom-4 md:right-4 md:top-auto md:w-[380px] md:flex-col-reverse">
        {toasts.map((n) => <Toast key={n.id} n={n} onClose={() => close(n.id)} onOpen={() => open(n)} />)}
      </div>
    </>
  );
}
