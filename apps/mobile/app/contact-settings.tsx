import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContactSettings } from '@help/types';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Button, Card, Input, ListSkeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

function Editor({ initial }: { initial: ContactSettings }) {
  const qc = useQueryClient();
  const [s, setS] = useState(initial);
  useEffect(() => setS(initial), [initial]);
  const save = useMutation({
    mutationFn: () => api.providers.setContactSettings({ showPhone: s.showPhone, autoReplyEnabled: s.autoReplyEnabled, autoReplyText: s.autoReplyText?.trim() || null }),
    onSuccess: (r) => { qc.setQueryData(['contact-settings'], r); Alert.alert('Saved', 'Contact settings updated.'); },
    onError: (e) => Alert.alert('Could not save', errorMessage(e)),
  });
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><T v="heading" color={colors.text}>Show my phone number</T><T v="caption">Customers who are signed in can tap Show phone number on your profile. Each reveal is counted in Insights.</T></View>
        <Switch accessibilityLabel="Show my phone number" value={s.showPhone} onValueChange={(v) => setS({ ...s, showPhone: v })} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
      </Card>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T v="heading" color={colors.text}>Auto-reply when Busy or Away</T><T v="caption">Sends one short message to new chats so customers know when to expect a reply.</T></View>
          <Switch accessibilityLabel="Auto-reply" value={s.autoReplyEnabled} onValueChange={(v) => setS({ ...s, autoReplyEnabled: v })} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
        </View>
        {s.autoReplyEnabled ? <Input label="Custom message (optional)" multiline maxLength={300} value={s.autoReplyText ?? ''} onChangeText={(t) => setS({ ...s, autoReplyText: t })} hint="Leave empty to use your status note." /> : null}
      </Card>
      <Button size="lg" title="Save" disabled={!dirty} loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}

export default function ContactSettingsScreen() {
  const q = useQuery({ queryKey: ['contact-settings'], queryFn: () => api.providers.contactSettings() });
  return (
    <Screen title="Contact settings" keyboard onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>{(d) => <Editor initial={d} />}</QueryBoundary>
    </Screen>
  );
}
