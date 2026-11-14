import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import * as Notifications from 'expo-notifications';
import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import type { MessageDto, NotificationCategory, NotificationDto, RealtimeEvent } from '@help/types';
import type { Paged } from '@help/api-client';
import { NotificationBanner } from '@/components/NotificationBanner';
import { api } from './api';
import { isCurrentRoute, mapLink } from './links';
import { setBadge } from './push';
import { useSession } from './session';

export type UnreadCounts = { count: number; byCategory: Partial<Record<NotificationCategory, number>> };
interface RT {
  unread: UnreadCounts;
  connected: boolean;
  open: (link: string | null | undefined) => void;
}
const Ctx = createContext<RT>({ unread: { count: 0, byCategory: {} }, connected: false, open: () => undefined });
export const useRealtime = () => useContext(Ctx);

const EMPTY: UnreadCounts = { count: 0, byCategory: {} };

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { signedIn } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);
  const [queue, setQueue] = useState<NotificationDto[]>([]);
  const seen = useRef(new Set<string>());
  const [active, setActive] = useState(AppState.currentState === 'active');

  const unreadQ = useQuery({ queryKey: ['unread'], queryFn: () => api.notifications.unreadCount(), enabled: signedIn, staleTime: 30_000 });
  const unread = unreadQ.data ?? EMPTY;

  useEffect(() => { if (signedIn) setBadge(unread.count); else setBadge(0); }, [unread.count, signedIn]);

  const open = useCallback((link: string | null | undefined) => { router.push(mapLink(link)); }, [router]);

  const enqueue = useCallback((n: NotificationDto) => {
    if (seen.current.has(n.id)) return;
    seen.current.add(n.id);
    if (isCurrentRoute(pathRef.current, n.link)) return; // already looking at it
    setQueue((q) => [...q, n]);
  }, []);

  const onEvent = useCallback((e: RealtimeEvent) => {
    switch (e.type) {
      case 'notification.created': {
        qc.setQueryData<UnreadCounts>(['unread'], (old) => {
          const o = old ?? EMPTY;
          const cat = e.notification.category;
          return { count: e.unreadCount, byCategory: { ...o.byCategory, [cat]: (o.byCategory[cat] ?? 0) + 1 } };
        });
        qc.invalidateQueries({ queryKey: ['notifications'] });
        enqueue(e.notification);
        break;
      }
      case 'notification.read':
        qc.setQueryData<UnreadCounts>(['unread'], (old) => ({ ...(old ?? EMPTY), count: e.unreadCount }));
        qc.invalidateQueries({ queryKey: ['unread'] });
        qc.invalidateQueries({ queryKey: ['notifications'] });
        break;
      case 'message.created':
        qc.setQueryData<InfiniteData<Paged<MessageDto>, string | undefined>>(['conv-messages', e.conversationId], (old) => {
          if (!old || old.pages.some((p) => p.items.some((m) => m.id === e.message.id))) return old;
          const [first, ...rest] = old.pages;
          return first ? { ...old, pages: [{ ...first, items: [e.message, ...first.items] }, ...rest] } : old;
        });
        qc.invalidateQueries({ queryKey: ['conversations'] });
        qc.invalidateQueries({ queryKey: ['conversation', e.conversationId] });
        break;
      case 'conversation.read':
        qc.invalidateQueries({ queryKey: ['conversations'] });
        break;
      case 'support.updated':
        qc.invalidateQueries({ queryKey: ['support'] });
        qc.invalidateQueries({ queryKey: ['ticket', e.ticketId] });
        break;
      default:
        break;
    }
  }, [qc, enqueue]);

  // SSE lifecycle: start after login, stop on logout/background, restart on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!signedIn || !active) return;
    const stop = api.notifications.subscribe(onEvent, {
      fetchImpl: expoFetch as unknown as typeof fetch,
      onStatus: (s) => { connectedRef.current = s === 'open'; setConnected(s === 'open'); },
    });
    qc.invalidateQueries({ queryKey: ['unread'] });
    return () => { stop(); connectedRef.current = false; setConnected(false); };
  }, [signedIn, active, onEvent, qc]);

  // Pushes: foreground (fallback banner only when SSE is down) and taps (background or cold start).
  useEffect(() => {
    if (!signedIn) return;
    let subs: { remove: () => void }[] = [];
    try {
      subs = [
        Notifications.addNotificationReceivedListener((n) => {
          const c = n.request.content;
          const d = (c.data ?? {}) as Record<string, unknown>;
          const id = typeof d.notificationId === 'string' ? d.notificationId : n.request.identifier;
          if (connectedRef.current) return;
          enqueue({
            id, type: 'push', category: (d.category as NotificationCategory) ?? 'STATUS', title: c.title ?? '', body: c.body ?? '',
            link: typeof d.link === 'string' ? d.link : null, imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl : null,
            groupKey: null, groupCount: 1, important: d.important === true, data: d, readAt: null, createdAt: new Date().toISOString(),
          });
        }),
        Notifications.addNotificationResponseReceivedListener((r) => {
          const link = (r.notification.request.content.data as { link?: string } | undefined)?.link;
          open(link);
        }),
      ];
      Notifications.getLastNotificationResponseAsync().then((r) => {
        const link = (r?.notification.request.content.data as { link?: string } | undefined)?.link;
        if (link && r && !seen.current.has(`resp-${r.notification.request.identifier}`)) {
          seen.current.add(`resp-${r.notification.request.identifier}`);
          setTimeout(() => open(link), 400);
        }
      }).catch(() => undefined);
    } catch { /* push unsupported in this runtime */ }
    return () => subs.forEach((s) => s.remove());
  }, [signedIn, enqueue, open]);

  const head = queue[0] ?? null;
  const onDismissed = useCallback((id: string) => setQueue((q) => q.filter((x) => x.id !== id)), []);
  const onPressBanner = useCallback((n: NotificationDto) => {
    if (!n.id.startsWith('push')) api.notifications.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: ['unread'] })).catch(() => undefined);
    open(n.link);
  }, [open, qc]);

  const value = useMemo(() => ({ unread: signedIn ? unread : EMPTY, connected, open }), [unread, connected, open, signedIn]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <NotificationBanner item={head} onPress={onPressBanner} onDismissed={onDismissed} />
    </Ctx.Provider>
  );
}
