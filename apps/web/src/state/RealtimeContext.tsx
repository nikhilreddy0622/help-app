import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageDto, NotificationCategory, NotificationDto, RealtimeEvent } from '@help/types';
import { useApi } from '../lib/api';
import { useAuth } from './AuthContext';

export interface Unread { count: number; byCategory: Partial<Record<NotificationCategory, number>> }
type Status = 'idle' | 'connecting' | 'open' | 'closed' | 'paused';
type Listener = (n: NotificationDto) => void;

interface Value { unread: Unread; status: Status; onNotification: (l: Listener) => () => void }
const EMPTY: Unread = { count: 0, byCategory: {} };
const Ctx = createContext<Value>({ unread: EMPTY, status: 'idle', onNotification: () => () => undefined });
export const useRealtime = () => useContext(Ctx);
export const useUnread = () => useContext(Ctx).unread;

export const UNREAD_KEY = ['notif-unread'] as const;
export const HIDDEN_PAUSE_MS = 5 * 60_000;

/** Client-only. Live SSE: unread badge, chat append, toasts. Pauses when the tab is hidden >5 min. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const qc = useQueryClient();
  const { status: authStatus } = useAuth();
  const authed = authStatus === 'authed';
  const [status, setStatus] = useState<Status>('idle');
  const listeners = useRef(new Set<Listener>());

  const unreadQuery = useQuery({ queryKey: UNREAD_KEY, queryFn: () => api.notifications.unreadCount(), enabled: authed, staleTime: 60_000 });
  const unread: Unread = authed && unreadQuery.data ? unreadQuery.data : EMPTY;

  const onNotification = useCallback((l: Listener) => { listeners.current.add(l); return () => { listeners.current.delete(l); }; }, []);

  useEffect(() => {
    if (!authed) { setStatus('idle'); return; }
    let stop: (() => void) | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

    const handle = (e: RealtimeEvent) => {
      switch (e.type) {
        case 'notification.created': {
          const cat = e.notification.category;
          qc.setQueryData<Unread>(UNREAD_KEY, (old) => ({ count: e.unreadCount, byCategory: { ...(old?.byCategory ?? {}), [cat]: (old?.byCategory[cat] ?? 0) + 1 } }));
          void qc.invalidateQueries({ queryKey: ['notifications'] });
          listeners.current.forEach((l) => l(e.notification));
          break;
        }
        case 'notification.read':
          qc.setQueryData<Unread>(UNREAD_KEY, (old) => ({ count: e.unreadCount, byCategory: e.ids === 'all' ? {} : (old?.byCategory ?? {}) }));
          void qc.invalidateQueries({ queryKey: ['notifications'] });
          if (e.ids !== 'all') void qc.invalidateQueries({ queryKey: UNREAD_KEY });
          break;
        case 'message.created':
          qc.setQueryData<{ items: MessageDto[]; next: string | null }>(['messages', e.conversationId], (old) => (old && !old.items.some((m) => m.id === e.message.id) ? { ...old, items: [e.message, ...old.items] } : old));
          void qc.invalidateQueries({ queryKey: ['conversations'] });
          break;
        case 'conversation.read':
          void qc.invalidateQueries({ queryKey: ['conversations'] });
          break;
        case 'support.updated':
          void qc.invalidateQueries({ queryKey: ['support'] });
          break;
        case 'live_request.responder_added':
        case 'live_request.closed':
          void qc.invalidateQueries({ queryKey: ['live-mine'] });
          break;
        case 'live_request.created':
          void qc.invalidateQueries({ queryKey: ['live-incoming'] });
          break;
        default: break;
      }
    };
    const start = () => {
      if (stop) return;
      stop = api.notifications.subscribe(handle, { onStatus: (s) => setStatus(s) });
    };
    const pause = () => { stop?.(); stop = null; setStatus('paused'); };
    const onVis = () => {
      if (document.hidden) {
        hiddenTimer = setTimeout(pause, HIDDEN_PAUSE_MS);
      } else {
        clearTimeout(hiddenTimer);
        if (!stop) { start(); void qc.invalidateQueries({ queryKey: UNREAD_KEY }); void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: ['conversations'] }); }
      }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); clearTimeout(hiddenTimer); stop?.(); stop = null; };
  }, [authed, api, qc]);

  const value = useMemo(() => ({ unread, status, onNotification }), [unread, status, onNotification]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
