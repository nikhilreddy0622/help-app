import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Ticket } from 'lucide-react-native';
import type { TicketStatus } from '@help/types';
import { IconButton, Screen } from '@/components/Screen';
import { Card, EmptyState, ErrorState, ListSkeleton, Pill, T } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { colors } from '@/lib/theme';

export const TICKET_STATUS: Record<TicketStatus, [string, string, string]> = {
  OPEN: ['Open', colors.infoBg, colors.infoFg], WAITING_ON_USER: ['Reply needed', colors.warningBg, colors.warningFg],
  RESOLVED: ['Resolved', colors.successBg, colors.successFg], CLOSED: ['Closed', colors.surfaceMuted, '#334155'],
};

export default function Tickets() {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['support'], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.support.list({ cursor: pageParam }), getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  return (
    <Screen scroll={false} title="Support tickets" right={<IconButton label="New ticket" icon={<Plus size={22} color={colors.navy} />} onPress={() => router.push('/support/new')} />}>
      {q.isPending ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <FlatList
          data={q.data.pages.flatMap((p) => p.items)} keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={async () => { await q.refetch(); }} tintColor={colors.teal700} />}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          ListEmptyComponent={<EmptyState icon={<Ticket size={28} color={colors.textMuted} />} title="No tickets yet" body="Ask us anything about chats, payments or your account. We reply here." actionLabel="Contact support" onAction={() => router.push('/support/new')} />}
          renderItem={({ item }) => {
            const [l, bg, fg] = TICKET_STATUS[item.status];
            return (
              <Card onPress={() => router.push(`/support/${item.id}`)} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <T v="caption">#{item.number} {'·'} {item.category}</T>
                  <Pill label={l} bg={bg} fg={fg} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="heading" color={colors.text} numberOfLines={2} style={{ flex: 1 }}>{item.subject}</T>
                  {item.unreadForUser ? <View accessibilityLabel="Unread reply" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal }} /> : null}
                </View>
                <T v="caption">Updated {formatDateTime(item.lastMessageAt)}</T>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
