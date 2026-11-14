import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react-native';
import { IconButton, QueryBoundary, Screen } from '@/components/Screen';
import { Button, Card, Input, ListSkeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

function Editor({ initial }: { initial: string[] }) {
  const qc = useQueryClient();
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState('');
  useEffect(() => setList(initial), [initial]);
  const add = () => { const t = draft.trim(); if (t && list.length < 10) { setList([...list, t]); setDraft(''); } };
  const save = useMutation({
    mutationFn: () => api.providers.setQuickReplies(list),
    onSuccess: (r) => { qc.setQueryData(['quick-replies'], r); Alert.alert('Saved', 'Quick replies updated.'); },
    onError: (e) => Alert.alert('Could not save', errorMessage(e)),
  });
  return (
    <View style={{ gap: 16 }}>
      <T color={colors.textMuted}>Saved answers appear as tappable chips above the chat box. Up to 10.</T>
      {list.map((r, i) => (
        <Card key={`${r}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T style={{ flex: 1 }}>{r}</T>
          <IconButton label={`Remove ${r}`} icon={<Trash2 size={18} color={colors.danger} />} onPress={() => setList(list.filter((_, j) => j !== i))} />
        </Card>
      ))}
      {list.length < 10 ? (
        <View style={{ gap: 8 }}>
          <Input label="New quick reply" value={draft} onChangeText={setDraft} maxLength={300} onSubmitEditing={add} returnKeyType="done" placeholder="e.g. I can visit tomorrow morning" />
          <Button kind="secondary" title="Add" icon={<Plus size={18} color={colors.navy} />} disabled={!draft.trim()} onPress={add} />
        </View>
      ) : null}
      <Button size="lg" title="Save" disabled={JSON.stringify(list) === JSON.stringify(initial)} loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}

export default function QuickReplies() {
  const q = useQuery({ queryKey: ['quick-replies'], queryFn: () => api.providers.quickReplies() });
  return (
    <Screen title="Quick replies" keyboard onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>{(d) => <Editor initial={d.replies} />}</QueryBoundary>
    </Screen>
  );
}
