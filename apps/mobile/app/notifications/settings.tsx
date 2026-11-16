import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationCategory, NotificationPreferences } from '@help/types';
import { CATEGORY_LABEL } from '@/components/NotifIcon';
import { QueryBoundary, Screen } from '@/components/Screen';
import { TimeField } from '@/components/TimeField';
import { Button, Card, ListSkeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { minuteLabel } from '@/lib/format';
import { colors } from '@/lib/theme';

const CATS: NotificationCategory[] = ['STATUS', 'MESSAGES', 'PAYMENTS', 'REVIEWS', 'ACCOUNT', 'PROMOTIONS'];

function Editor({ initial }: { initial: NotificationPreferences }) {
  const qc = useQueryClient();
  const [p, setP] = useState(initial);
  useEffect(() => setP(initial), [initial]);
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  const save = useMutation({
    mutationFn: () => api.notifications.setPreferences(p),
    onSuccess: (r) => { qc.setQueryData(['notif-prefs'], r); Alert.alert('Saved', 'Your notification settings were updated.'); },
    onError: (e) => Alert.alert('Could not save', errorMessage(e)),
  });
  const setCh = (c: NotificationCategory, k: 'push' | 'email', v: boolean) => setP((x) => ({ ...x, channels: { ...x.channels, [c]: { ...x.channels[c], [k]: v } } }));
  const qh = p.quietHours;
  return (
    <View style={{ gap: 20 }}>
      <Card padded={false}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <T v="overline" style={{ flex: 1 }}>Category</T><T v="overline" style={{ width: 64, textAlign: 'center' }}>Push</T><T v="overline" style={{ width: 64, textAlign: 'center' }}>Email</T>
        </View>
        {CATS.map((c, i) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 52, borderBottomWidth: i < CATS.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
            <T style={{ flex: 1 }}>{CATEGORY_LABEL[c]}</T>
            <View style={{ width: 64, alignItems: 'center' }}><Switch accessibilityLabel={`${CATEGORY_LABEL[c]} push`} value={p.channels[c]?.push ?? true} onValueChange={(v) => setCh(c, 'push', v)} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" /></View>
            <View style={{ width: 64, alignItems: 'center' }}><Switch accessibilityLabel={`${CATEGORY_LABEL[c]} email`} value={p.channels[c]?.email ?? true} onValueChange={(v) => setCh(c, 'email', v)} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" /></View>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T v="heading" color={colors.text}>Quiet hours</T><T v="caption">Pause push alerts overnight. In-app records are always kept.</T></View>
          <Switch accessibilityLabel="Quiet hours" value={qh.enabled} onValueChange={(v) => setP((x) => ({ ...x, quietHours: { ...x.quietHours, enabled: v } }))} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TimeField label="From" minutes={qh.startMinute} disabled={!qh.enabled} onChange={(m) => setP((x) => ({ ...x, quietHours: { ...x.quietHours, startMinute: m } }))} />
          <TimeField label="Until" minutes={qh.endMinute} disabled={!qh.enabled} onChange={(m) => setP((x) => ({ ...x, quietHours: { ...x.quietHours, endMinute: m } }))} />
        </View>
        <T v="caption" style={{ fontSize: 12 }}>Important alerts, such as a payment failing, still come through during quiet hours.</T>
      </Card>
      <Button size="lg" title="Save changes" disabled={!dirty} loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}

export default function NotificationSettings() {
  const q = useQuery({ queryKey: ['notif-prefs'], queryFn: () => api.notifications.preferences() });
  return (
    <Screen title="Notifications" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>{(d) => <Editor initial={d} />}</QueryBoundary>
    </Screen>
  );
}
