import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, CheckCheck, MoreVertical } from 'lucide-react';
import type { NotificationCategory, NotificationDto } from '@help/types';
import { useApi } from '../../lib/api';
import { areaOf, mapLink } from '../../lib/links';
import { timeAgo } from '../../lib/format';
import { UNREAD_KEY, useUnread, type Unread } from '../../state/RealtimeContext';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Field';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { CATEGORIES, CATEGORY_META, NotifIcon } from './NotifIcon';

interface Row { n: NotificationDto; count: number }

/** Collapses consecutive rows sharing a groupKey ("3 new messages from Rahul"). */
function collapse(items: NotificationDto[]): Row[] {
  const rows: Row[] = [];
  const byKey = new Map<string, Row>();
  for (const n of items) {
    const existing = n.groupKey ? byKey.get(n.groupKey) : undefined;
    if (existing) { existing.count += Math.max(1, n.groupCount); if (!n.readAt && existing.n.readAt) existing.n = { ...existing.n, readAt: null }; continue; }
    const row = { n, count: Math.max(1, n.groupCount) };
    rows.push(row);
    if (n.groupKey) byKey.set(n.groupKey, row);
  }
  return rows;
}

function sectionOf(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso), now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
}

function RowItem({ row, onOpen, onRead, onDelete }: { row: Row; onOpen: () => void; onRead: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const { n, count } = row;
  const unread = !n.readAt;
  return (
    <li className={`relative flex items-start gap-1 border-b border-divider ${unread ? 'bg-teal-tint' : 'bg-white'}`}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-surface/60">
        <span className="mt-1 flex w-2 flex-none justify-center">{unread && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-teal-700" />}</span>
        <NotifIcon n={n} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-sm ${unread ? 'font-semibold' : 'font-medium'} text-navy`}>{n.title}</span>
            {count > 1 && <span className="flex-none rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">{count} new</span>}
          </span>
          <span className="line-clamp-2 text-sm text-subtle">{n.body}</span>
          <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      <div className="relative flex-none py-2 pr-2">
        <button type="button" aria-label="Notification options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
          className="rounded-full p-2 text-subtle hover:bg-surface"><MoreVertical className="h-4 w-4" /></button>
        {menu && (
          <div role="menu" className="absolute right-2 top-10 z-10 w-44 rounded-md border border-line bg-white py-1 shadow-md" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(false); } }}>
            {unread && <button role="menuitem" type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => { setMenu(false); onRead(); }}>Mark as read</button>}
            <button role="menuitem" type="button" className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-surface" onClick={() => { setMenu(false); onDelete(); }}>Delete</button>
          </div>
        )}
      </div>
    </li>
  );
}

export function NotificationCenter({ variant, onNavigate }: { variant: 'popover' | 'page'; onNavigate?: () => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const unread = useUnread();
  const [category, setCategory] = useState<NotificationCategory | 'ALL'>('ALL');

  const q = useInfiniteQuery({
    queryKey: ['notifications', category],
    queryFn: ({ pageParam }) => api.notifications.list({ cursor: pageParam, category: category === 'ALL' ? undefined : category }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });

  const refresh = () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: UNREAD_KEY }); };
  const decrement = (cat: NotificationCategory, by: number) => qc.setQueryData<Unread>(UNREAD_KEY, (o) => o && ({ count: Math.max(0, o.count - by), byCategory: { ...o.byCategory, [cat]: Math.max(0, (o.byCategory[cat] ?? 0) - by) } }));

  const read = useMutation({ mutationFn: (r: Row) => (r.n.groupKey ? api.notifications.markGroupRead(r.n.groupKey) : api.notifications.markRead(r.n.id)), onSuccess: (_d, r) => { if (!r.n.readAt) decrement(r.n.category, r.count); refresh(); } });
  const del = useMutation({ mutationFn: (r: Row) => api.notifications.delete(r.n.id), onSuccess: (_d, r) => { if (!r.n.readAt) decrement(r.n.category, 1); refresh(); } });
  const readAll = useMutation({ mutationFn: () => api.notifications.markAllRead(category === 'ALL' ? undefined : category), onSuccess: refresh });

  const rows = useMemo(() => collapse(q.data?.pages.flatMap((p) => p.items) ?? []), [q.data]);
  const sections = useMemo(() => {
    const out: { title: string; rows: Row[] }[] = [];
    for (const r of rows) {
      const t = sectionOf(r.n.createdAt);
      const last = out[out.length - 1];
      if (last?.title === t) last.rows.push(r); else out.push({ title: t, rows: [r] });
    }
    return out;
  }, [rows]);

  const sentinel = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !q.hasNextPage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((e) => { if (e[0]?.isIntersecting && !q.isFetchingNextPage) void q.fetchNextPage(); }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [q, rows.length]);

  const open = (r: Row) => {
    if (!r.n.readAt) read.mutate(r);
    const target = mapLink(r.n.link, areaOf(loc.pathname), r.n.data);
    onNavigate?.();
    if (target) nav(target);
  };

  const tabCount = (c: NotificationCategory | 'ALL') => (c === 'ALL' ? unread.count : unread.byCategory[c] ?? 0);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 className="text-base font-semibold">Notifications</h2>
        <Button variant="ghost" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => readAll.mutate()} loading={readAll.isPending} disabled={tabCount(category) === 0}>Mark all read</Button>
      </div>
      <div role="group" aria-label="Filter by category" className="flex gap-2 overflow-x-auto px-4 pb-3">
        {(['ALL', ...CATEGORIES] as const).map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)} count={tabCount(c)}>{c === 'ALL' ? 'All' : CATEGORY_META[c].label}</Chip>
        ))}
      </div>
      <div className={`min-h-0 border-t border-divider ${variant === 'popover' ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
        {q.isPending ? (
          <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading notifications">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : q.isError ? (
          <div className="p-4"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="p-4"><EmptyState icon={<BellOff className="h-6 w-6" aria-hidden />} title="You're all caught up" text="New updates about bookings, messages and payments will appear here." /></div>
        ) : (
          <ul>
            {sections.map((s) => (
              <li key={s.title} role="presentation">
                <h3 className="bg-canvas px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">{s.title}</h3>
                <ul>{s.rows.map((r) => <RowItem key={r.n.id} row={r} onOpen={() => open(r)} onRead={() => read.mutate(r)} onDelete={() => del.mutate(r)} />)}</ul>
              </li>
            ))}
            <li ref={sentinel} className="p-3 text-center">
              {q.hasNextPage && <Button variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more</Button>}
            </li>
          </ul>
        )}
      </div>
      {variant === 'popover' && (
        <div className="border-t border-divider px-4 py-2.5 text-center">
          <Link to="/notifications" onClick={onNavigate} className="text-sm font-semibold">See all notifications</Link>
        </div>
      )}
    </div>
  );
}
