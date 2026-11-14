import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Send, Star } from 'lucide-react-native';
import type { MessageDto } from '@help/types';
import type { Paged } from '@help/api-client';
import { Header } from '@/components/Screen';
import { Button, EmptyState, ErrorState, ListSkeleton, PresencePill, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatTimeOnly } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

type Data = InfiniteData<Paged<MessageDto>, string | undefined>;

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useSession();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<FlatList<MessageDto>>(null);

  const conv = useQuery({ queryKey: ['conversation', id], queryFn: () => api.conversations.get(id!) });
  // Newest first; realtime appends into the first page of this cache entry.
  const q = useInfiniteQuery({
    queryKey: ['conv-messages', id], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.conversations.messages(id!, { cursor: pageParam }),
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const replies = useQuery({ queryKey: ['quick-replies'], queryFn: () => api.providers.quickReplies(), enabled: conv.data?.role === 'provider' });

  const items = useMemo(() => {
    const m = new Map<string, MessageDto>();
    (q.data?.pages ?? []).forEach((p) => p.items.forEach((x) => m.set(x.id, x)));
    return [...m.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first for an inverted list
  }, [q.data]);

  const newestId = items[0]?.id;
  useEffect(() => {
    if (newestId && conv.data?.unread !== 0) {
      api.conversations.markRead(id!).then(() => { qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['unread'] }); }).catch(() => undefined);
    }
  }, [newestId, id, qc, conv.data?.unread]);

  const send = useMutation({
    mutationFn: (body: string) => api.conversations.send(id!, body),
    onSuccess: (m) => {
      qc.setQueryData<Data>(['conv-messages', id], (old) => {
        if (!old || old.pages.some((p) => p.items.some((x) => x.id === m.id))) return old;
        const [first, ...rest] = old.pages;
        return first ? { ...old, pages: [{ ...first, items: [m, ...first.items] }, ...rest] } : old;
      });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setText(''); setErr(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const c = conv.data;
  const name = c?.counterpart.name ?? 'Chat';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <Header title={name} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        right={c?.role === 'customer' ? <Button kind="ghost" size="sm" title="Profile" onPress={() => router.push(`/provider/${c.provider.slug}`)} /> : undefined} />
      {c?.role === 'customer' ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <PresencePill status={c.provider.status} label={c.provider.statusLabel} />
        </View>
      ) : null}
      {c?.canReview ? (
        <Pressable onPress={() => router.push(`/review/${c.provider.id}`)} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, backgroundColor: pressed ? colors.warningBg : colors.tealTint, borderBottomWidth: 1, borderBottomColor: colors.border })}>
          <Star size={18} color={colors.teal} />
          <T v="label" style={{ flex: 1 }}>How was {c.provider.displayName.split(' ')[0]}? Write a review</T>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {q.isPending ? <ListSkeleton count={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
          <FlatList
            ref={list} inverted data={items} keyExtractor={(m) => m.id}
            onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }} onEndReachedThreshold={0.3}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}
            ListFooterComponent={q.isFetchingNextPage ? <T v="caption" align="center">Loading earlier messages{'…'}</T> : undefined}
            ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }] }}><EmptyState title="Say hello" body="Messages stay inside the app. Describe what you need." /></View>}
            renderItem={({ item }) => {
              if (item.auto) {
                return (
                  <View style={{ alignSelf: 'center', maxWidth: '90%', backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
                    <T v="micro" color={colors.textMuted}>Auto-reply</T>
                    <T v="caption" color={colors.textSubtle}>{item.body}</T>
                  </View>
                );
              }
              const mine = item.senderId === me?.id;
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? colors.teal700 : colors.white, borderWidth: mine ? 0 : 1, borderColor: colors.border, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 14, paddingVertical: 10, gap: 2 }}>
                  <T color={mine ? '#fff' : colors.text}>{item.body}</T>
                  <T v="caption" style={{ fontSize: 11, alignSelf: 'flex-end' }} color={mine ? '#CCFBF1' : colors.textMuted}>{formatTimeOnly(item.createdAt)}</T>
                </View>
              );
            }}
          />
        )}
        {err ? <T v="caption" color={colors.danger} style={{ paddingHorizontal: 16 }}>{err}</T> : null}
        {replies.data?.replies.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, backgroundColor: colors.white }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            {replies.data.replies.map((r) => (
              <Pressable key={r} onPress={() => setText(r)} accessibilityRole="button" accessibilityLabel={`Quick reply: ${r}`} style={({ pressed }) => ({ maxWidth: 260, minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.white })}>
                <T v="caption" color={colors.text} numberOfLines={1}>{r}</T>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={colors.textMuted} multiline maxLength={2000} accessibilityLabel="Message"
            style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text }} />
          <Pressable onPress={() => text.trim() && send.mutate(text.trim())} disabled={!text.trim() || send.isPending} accessibilityRole="button" accessibilityLabel="Send message"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || send.isPending ? 0.5 : 1 }}>
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
