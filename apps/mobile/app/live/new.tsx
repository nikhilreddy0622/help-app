import React, { useMemo, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Zap } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Button, Chip, Input, ListSkeleton, T } from '@/components/ui';
import { QueryBoundary } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useCategories } from '@/lib/hooks';
import { useLocation } from '@/lib/location';
import { colors } from '@/lib/theme';

export default function NewLiveRequest() {
  const router = useRouter();
  const loc = useLocation();
  const cats = useCategories();
  const [categoryId, setCategoryId] = useState<string>();
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);

  const liveCats = useMemo(() => (cats.data ?? []).filter((c) => c.supportsLiveRequest), [cats.data]);

  const create = useMutation({
    mutationFn: () => api.liveRequests.create({ categoryId: categoryId!, lat: loc.coords.lat, lng: loc.coords.lng, note: note.trim() || undefined, urgent }),
    onSuccess: () => router.replace('/live/status'),
    onError: (e) => Alert.alert('Could not send request', errorMessage(e)),
  });

  return (
    <Screen
      title="Request now"
      subtitle="Get help from available pros nearby"
      contentStyle={{ padding: 16, gap: 18 }}
      footer={<View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}>
        <Button title="Send request" icon={<Zap size={18} color="#fff" />} disabled={!categoryId} loading={create.isPending} onPress={() => create.mutate()} />
      </View>}
    >
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.tealTint }}>
        <Zap size={20} color={colors.teal700} />
        <T v="caption" color={colors.teal800} style={{ flex: 1 }}>We’ll alert available professionals near you. Interested ones respond, and you pick who to contact. Hiring happens directly with them.</T>
      </View>

      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>What do you need?</T>
        <QueryBoundary q={cats} skeleton={<ListSkeleton count={1} />}>
          {() => liveCats.length === 0
            ? <T v="caption" color={colors.textMuted}>Live requests aren’t available yet in your area.</T>
            : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{liveCats.map((c) => <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}</View>}
        </QueryBoundary>
      </View>

      <Input label="Add a note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Pipe burst under the sink, need someone now" multiline maxLength={240} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}><T weight={600}>Mark as urgent</T><T v="caption" color={colors.textMuted}>Alerts pros even during their quiet hours.</T></View>
        <Switch value={urgent} onValueChange={setUrgent} trackColor={{ true: colors.teal700 }} />
      </View>

      <T v="caption" color={colors.textMuted}>Your exact location stays private — pros see only the approximate area until you choose one. Location used: {loc.label}.</T>
    </Screen>
  );
}
