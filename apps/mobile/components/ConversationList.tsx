import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react-native';
import type { ConversationDto } from '@help/types';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';
import { relativeTime } from '@/lib/format';
import { Avatar, Card, EmptyState, ErrorState, ListSkeleton, PresencePill, T } from './ui';

function Row({ c, onPress }: { c: ConversationDto; onPress: () => void }) {
  const name = c.counterpart.name;
  return (
    <Card onPress={onPress} accessibilityLabel={`${name}${c.unread ? `, ${c.unread} unread` : ''}`} style={{ gap: 10, padding: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar name={name} url={c.counterpart.avatarUrl} size={52} rounded />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T v="heading" color={colors.text} numberOfLines={1} style={{ flex: 1 }} weight={c.unread ? 700 : 600}>{name}</T>
            {c.lastMessage ? <T v="caption" style={{ fontSize: 12 }}>{relativeTime(c.lastMessage.createdAt)}</T> : null}
          </View>
          <T v="caption" numberOfLines={1} color={c.unread ? colors.text : colors.textMuted}>{c.lastMessage ? (c.lastMessage.auto ? `Auto-reply: ${c.lastMessage.body}` : c.lastMessage.body) : 'No messages yet'}</T>
        </View>
        {c.unread ? <View accessibilityLabel={`${c.unread} unread`} style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T v="micro" weight={800} color="#fff">{c.unread > 9 ? '9+' : c.unread}</T></View> : null}
      </View>
      {c.role === 'customer' ? <PresencePill status={c.provider.status} label={c.provider.statusLabel} /> : null}
    </Card>
  );
}

export function ConversationList({ role, emptyAction, onEmptyAction }: { role: 'customer' | 'provider'; emptyAction?: string; onEmptyAction?: () => void }) {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['conversations', role], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.conversations.list({ role, cursor: pageParam }),
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  if (q.isPending) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <FlatList
      data={q.data.pages.flatMap((p) => p.items)} keyExtractor={(c) => c.id}
      renderItem={({ item }) => <Row c={item} onPress={() => router.push(`/chat/${item.id}`)} />}
      contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={async () => { await q.refetch(); }} tintColor={colors.teal700} />}
      onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }} onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon={<MessageCircle size={28} color={colors.textMuted} />} title="No conversations yet" body={role === 'customer' ? 'Message a professional from their profile. Replies show up here.' : 'When customers message you, chats appear here.'} actionLabel={emptyAction} onAction={onEmptyAction} />}
    />
  );
}
