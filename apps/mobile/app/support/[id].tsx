import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Send } from 'lucide-react-native';
import { Gallery } from '@/components/Gallery';
import { Header } from '@/components/Screen';
import { Button, ErrorState, ListSkeleton, Pill, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import type { SupportMessageDto } from '@help/types';
import { TICKET_STATUS } from './index';

export default function TicketThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<{ uri: string; mime: string }[]>([]);
  const [viewer, setViewer] = useState<{ urls: string[]; i: number } | null>(null);
  const list = useRef<FlatList>(null);
  // support.updated events invalidate ['ticket', id] from the realtime provider.
  const q = useQuery({ queryKey: ['ticket', id], queryFn: () => api.support.get(id!) });

  useEffect(() => { if (q.data?.unreadForUser) qc.invalidateQueries({ queryKey: ['support'] }); }, [q.data?.unreadForUser, qc]);

  const send = useMutation({
    mutationFn: async () => {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadImage(f, 'SUPPORT'));
      return api.support.reply(id!, text.trim() || 'Attachment', urls);
    },
    onSuccess: () => { setText(''); setFiles([]); qc.invalidateQueries({ queryKey: ['ticket', id] }); qc.invalidateQueries({ queryKey: ['support'] }); },
    onError: (e) => Alert.alert('Could not send', errorMessage(e)),
  });
  const close = useMutation({
    mutationFn: () => api.support.close(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); qc.invalidateQueries({ queryKey: ['support'] }); },
    onError: (e) => Alert.alert('Could not close', errorMessage(e)),
  });

  const t = q.data;
  const closed = t?.status === 'CLOSED';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t ? `#${t.number} ${t.subject}` : 'Ticket'} subtitle={t ? t.category : undefined} onBack={() => (router.canGoBack() ? router.back() : router.replace('/account/help'))}
        right={t && !closed ? <Button kind="ghost" size="sm" title="Close" onPress={() => Alert.alert('Close this ticket?', 'You can open a new one any time.', [{ text: 'Keep open', style: 'cancel' }, { text: 'Close ticket', onPress: () => close.mutate() }])} /> : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {q.isPending ? <ListSkeleton count={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
          <FlatList
            ref={list} data={t!.messages} keyExtractor={(m) => m.id} refreshing={q.isRefetching} onRefresh={() => q.refetch()}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ padding: 16, gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' }}
            ListHeaderComponent={t ? <View style={{ alignItems: 'center', paddingBottom: 8 }}><Pill label={TICKET_STATUS[t.status][0]} bg={TICKET_STATUS[t.status][1]} fg={TICKET_STATUS[t.status][2]} /></View> : undefined}
            renderItem={({ item }: { item: SupportMessageDto }) => (
              <View style={{ alignSelf: item.fromStaff ? 'flex-start' : 'flex-end', maxWidth: '85%', backgroundColor: item.fromStaff ? colors.white : colors.teal700, borderWidth: item.fromStaff ? 1 : 0, borderColor: colors.border, borderRadius: 16, padding: 12, gap: 6 }}>
                <T v="micro" color={item.fromStaff ? colors.teal700 : '#CCFBF1'}>{item.fromStaff ? `${item.authorName} (help support)` : 'You'}</T>
                <T color={item.fromStaff ? colors.text : '#fff'}>{item.body}</T>
                {item.attachments.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {item.attachments.map((u, i) => (
                      <Pressable key={u} onPress={() => setViewer({ urls: item.attachments, i })} accessibilityRole="imagebutton" accessibilityLabel="Open attachment"><Image cachePolicy="memory-disk" contentFit="cover" transition={120} source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 8 }} /></Pressable>
                    ))}
                  </View>
                ) : null}
                <T v="caption" style={{ fontSize: 11 }} color={item.fromStaff ? colors.textMuted : '#CCFBF1'}>{formatDateTime(item.createdAt)}</T>
              </View>
            )}
          />
        )}
        {t && !closed ? (
          <View style={{ padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
            {files.length ? <T v="caption">{files.length} attachment{files.length > 1 ? 's' : ''} ready</T> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Pressable onPress={async () => { try { const r = await pickImage({ multiple: true }); setFiles((x) => [...x, ...r].slice(0, 4)); } catch (e) { Alert.alert('Photos', errorMessage(e)); } }} accessibilityRole="button" accessibilityLabel="Attach photo" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Camera size={22} color={colors.navy} /></Pressable>
              <TextInput value={text} onChangeText={setText} placeholder="Reply" placeholderTextColor={colors.textMuted} multiline accessibilityLabel="Reply" style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text }} />
              <Pressable onPress={() => send.mutate()} disabled={(!text.trim() && !files.length) || send.isPending} accessibilityRole="button" accessibilityLabel="Send reply" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', opacity: (!text.trim() && !files.length) || send.isPending ? 0.5 : 1 }}><Send size={18} color="#fff" /></Pressable>
            </View>
          </View>
        ) : t ? <T v="caption" align="center" style={{ padding: 16 }}>This ticket is closed.</T> : null}
      </KeyboardAvoidingView>
      <Gallery urls={viewer?.urls ?? []} index={viewer ? viewer.i : null} onClose={() => setViewer(null)} />
    </SafeAreaView>
  );
}
