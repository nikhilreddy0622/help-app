import React, { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { BellOff, CheckCheck, Settings, Trash2, Check } from 'lucide-react-native';
import type { NotificationCategory, NotificationDto } from '@help/types';
import type { Paged } from '@help/api-client';
import { NotifLeading } from '@/components/NotifIcon';
import { IconButton, Header } from '@/components/Screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, Skeleton, T } from '@/components/ui';
import { api } from '@/lib/api';
import { dayBucket, relativeTime } from '@/lib/format';
import { mapLink } from '@/lib/links';
import { useRealtime } from '@/lib/realtime';
import { colors } from '@/lib/theme';

type Filter = 'ALL' | 'STATUS' | 'MESSAGES' | 'PAYMENTS' | 'REVIEWS';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' }, { key: 'STATUS', label: 'Status' }, { key: 'MESSAGES', label: 'Messages' }, { key: 'PAYMENTS', label: 'Payments' }, { key: 'REVIEWS', label: 'Reviews' },
];
type Data = InfiniteData<Paged<NotificationDto>, string | undefined>;

function groupText(n: NotificationDto): { title: string; body: string } {
  if (n.groupCount > 1) {
    const who = typeof n.data?.actorName === 'string' ? n.data.actorName : n.title;
    return n.category === 'MESSAGES'
      ? { title: `${n.groupCount} new messages from ${who}`, body: n.body }
      : { title: n.title, body: `${n.groupCount} updates · ${n.body}` };
  }
  return { title: n.title, body: n.body };
}

function Row({ n, onOpen, onRead, onDelete }: { n: NotificationDto; onOpen: () => void; onRead: () => void; onDelete: () => void }) {
  const ref = useRef<{ close: () => void } | null>(null);
  const unread = !n.readAt;
  const t = groupText(n);
  const actions = () => (
    <View style={{ flexDirection: 'row' }}>
      {unread ? (
        <Pressable onPress={() => { ref.current?.close(); onRead(); }} accessibilityRole="button" accessibilityLabel="Mark as read" style={{ width: 72, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Check size={20} color="#fff" /><T v="micro" color="#fff">Read</T>
        </Pressable>
      ) : null}
      <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete notification" style={{ width: 72, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Trash2 size={20} color="#fff" /><T v="micro" color="#fff">Delete</T>
      </Pressable>
    </View>
  );
  return (
    <ReanimatedSwipeable ref={ref as never} renderRightActions={actions} overshootRight={false} friction={2}>
      <Pressable
        onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${unread ? 'Unread. ' : ''}${t.title}. ${t.body}. ${relativeTime(n.createdAt)}`}
        style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: unread ? colors.tealTint : colors.white, borderBottomWidth: 1, borderBottomColor: colors.divider }}
      >
        <NotifLeading n={n} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <T v="label" weight={unread ? 600 : 500} numberOfLines={2} style={{ flex: 1 }}>{t.title}</T>
            <T v="caption" style={{ fontSize: 12 }}>{relativeTime(n.createdAt)}</T>
          </View>
          <T v="caption" color={colors.textSubtle} numberOfLines={2}>{t.body}</T>
        </View>
        {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal, marginTop: 6 }} accessibilityLabel="Unread" /> : <View style={{ width: 8 }} />}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

export default function NotificationCentre() {
  const router = useRouter();
  const qc = useQueryClient();
  const { unread } = useRealtime();
  const [filter, setFilter] = useState<Filter>('ALL');
  const category = filter === 'ALL' ? undefined : (filter as NotificationCategory);

  const q = useInfiniteQuery({
    queryKey: ['notifications', filter], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.notifications.list({ cursor: pageParam, category }),
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const all = q.data?.pages.flatMap((p) => p.items) ?? [];

  const sections = useMemo(() => {
    const m: Record<string, NotificationDto[]> = { Today: [], Yesterday: [], Earlier: [] };
    for (const n of all) m[dayBucket(n.createdAt)]!.push(n);
    return (['Today', 'Yesterday', 'Earlier'] as const).filter((k) => m[k]!.length).map((k) => ({ title: k, data: m[k]! }));
  }, [all]);

  const patch = (fn: (n: NotificationDto) => NotificationDto | null) =>
    qc.setQueriesData<Data>({ queryKey: ['notifications'] }, (old) => old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.flatMap((n) => { const r = fn(n); return r ? [r] : []; }) })) });
  const refreshCounts = () => qc.invalidateQueries({ queryKey: ['unread'] });

  const read = useMutation({
    mutationFn: (n: NotificationDto) => (n.groupKey ? api.notifications.markGroupRead(n.groupKey) : api.notifications.markRead(n.id)),
    onMutate: (n) => patch((x) => (x.id === n.id || (n.groupKey && x.groupKey === n.groupKey) ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)),
    onSettled: refreshCounts,
  });
  const del = useMutation({
    mutationFn: (n: NotificationDto) => api.notifications.delete(n.id),
    onMutate: (n) => patch((x) => (x.id === n.id ? null : x)),
    onSettled: refreshCounts,
  });
  const readAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(category),
    onMutate: () => patch((x) => (!category || x.category === category ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)),
    onSettled: () => { refreshCounts(); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const open = (n: NotificationDto) => { if (!n.readAt) read.mutate(n); router.push(mapLink(n.link)); };
  const countFor = (f: Filter) => (f === 'ALL' ? unread.count : unread.byCategory[f as NotificationCategory] ?? 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <Header
        title="Notifications"
        right={<View style={{ flexDirection: 'row' }}>
          <IconButton label="Mark all as read" icon={<CheckCheck size={22} color={countFor(filter) ? colors.teal700 : colors.textMuted} />} onPress={() => countFor(filter) && readAll.mutate()} />
          <IconButton label="Notification settings" icon={<Settings size={20} color={colors.navy} />} onPress={() => router.push('/notifications/settings')} />
        </View>}
      />
      <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {FILTERS.map((f) => <Chip key={f.key} label={f.label} count={countFor(f.key)} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
        </ScrollView>
      </View>
      {q.isPending ? (
        <View style={{ padding: 16, gap: 20 }}>{Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}><Skeleton w={44} h={44} r={22} /><View style={{ flex: 1, gap: 8 }}><Skeleton w="70%" h={14} /><Skeleton w="95%" h={12} /></View></View>
        ))}</View>
      ) : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <SectionList
          sections={sections} keyExtractor={(n) => n.id} stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <T v="overline" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>{section.title}</T>}
          renderItem={({ item }) => <Row n={item} onOpen={() => open(item)} onRead={() => read.mutate(item)} onDelete={() => del.mutate(item)} />}
          refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={async () => { await q.refetch(); }} tintColor={colors.teal700} />}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }} onEndReachedThreshold={0.5}
          contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}
          ListFooterComponent={q.isFetchingNextPage ? <View style={{ padding: 16 }}><Skeleton h={44} /></View> : undefined}
          ListEmptyComponent={<EmptyState icon={<BellOff size={28} color={colors.textMuted} />} title="You're all caught up" body="Status updates, messages and payment alerts will appear here." actionLabel={filter === 'ALL' ? undefined : 'Show all'} onAction={() => setFilter('ALL')} />}
        />
      )}
    </SafeAreaView>
  );
}
