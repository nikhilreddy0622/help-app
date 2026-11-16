import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, ChevronRight, Zap } from 'lucide-react-native';
import { STATUS_MESSAGE_MAX, updatedAgo } from '@help/domain';
import type { PresenceStatus, ProviderDashboard } from '@help/types';
import { DateTimeSheet } from '@/components/DateTimeSheet';
import { BellButton, QueryBoundary, Screen } from '@/components/Screen';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { Button, Card, Chip, Input, ListSkeleton, PresencePill, Segmented, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const SUGGESTIONS = ['On a job, back by 6 PM', 'Available from Monday', 'On leave this week'];
type Presence = ProviderDashboard['presence'];
type UntilKey = 'none' | 'later' | 'tomorrow' | 'pick';

function laterToday(): Date { const d = new Date(); d.setHours(21, 0, 0, 0); if (d.getTime() < Date.now() + 30 * 60_000) return new Date(Date.now() + 3 * 3_600_000); return d; }
function tomorrow9(): Date { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }

function StatusCard({ presence }: { presence: Presence }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PresenceStatus>(presence.status);
  const [message, setMessage] = useState(presence.statusMessage ?? '');
  const [until, setUntil] = useState<Date | null>(presence.statusUntil ? new Date(presence.statusUntil) : null);
  const [untilKey, setUntilKey] = useState<UntilKey>(presence.statusUntil ? 'pick' : 'none');
  const [picker, setPicker] = useState(false);
  useEffect(() => { setStatus(presence.status); setMessage(presence.statusMessage ?? ''); setUntil(presence.statusUntil ? new Date(presence.statusUntil) : null); }, [presence.status, presence.statusMessage, presence.statusUntil]);

  const apply = (p: Presence) => qc.setQueryData<ProviderDashboard>(['dashboard'], (d) => (d ? { ...d, presence: p } : d));
  const save = useMutation({
    mutationFn: () => api.providers.setStatus({ status, message: message.trim() || null, until: status === 'AVAILABLE' ? null : until }),
    onSuccess: (p) => { apply(p); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: (e) => Alert.alert('Could not update status', errorMessage(e)),
  });
  const confirm = useMutation({ mutationFn: () => api.providers.confirmStatus(), onSuccess: apply, onError: (e) => Alert.alert('Could not confirm', errorMessage(e)) });
  const visible = useMutation({
    mutationFn: (v: boolean) => api.providers.setVisibility(v),
    onSuccess: (p) => { apply(p); qc.invalidateQueries({ queryKey: ['my-provider'] }); },
    onError: (e) => Alert.alert('Could not update visibility', errorMessage(e)),
  });

  const stale = !presence.statusUpdatedAt || Date.now() - new Date(presence.statusUpdatedAt).getTime() > 24 * 3_600_000;
  const ago = presence.statusUpdatedAt ? updatedAgo(new Date(presence.statusUpdatedAt), new Date()) : null;
  const pick = (k: UntilKey) => {
    setUntilKey(k);
    if (k === 'none') setUntil(null);
    if (k === 'later') setUntil(laterToday());
    if (k === 'tomorrow') setUntil(tomorrow9());
    if (k === 'pick') setPicker(true);
  };

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <T v="overline">Your status</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PresencePill status={presence.status} label={presence.statusLabel} paused={presence.isPaused} />
          {ago ? <T v="caption" style={{ fontSize: 12 }}>{ago}</T> : null}
        </View>
      </View>

      {!stale ? null : (
        <View style={{ backgroundColor: colors.warningBg, borderRadius: 12, padding: 12, gap: 8 }}>
          <T v="caption" color={colors.warningFg}>Customers see when your status was last updated. Is it still right?</T>
          <Button size="sm" title="Still available? Tap to confirm" loading={confirm.isPending} onPress={() => confirm.mutate()} />
        </View>
      )}

      <Segmented value={status} onChange={setStatus} options={[{ key: 'AVAILABLE', label: 'Available' }, { key: 'BUSY', label: 'Busy' }, { key: 'AWAY', label: 'Away' }]} />

      <Input label="Note for customers (optional)" value={message} onChangeText={setMessage} maxLength={STATUS_MESSAGE_MAX} hint={`${message.length}/${STATUS_MESSAGE_MAX}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUGGESTIONS.map((s) => <Chip key={s} label={s} onPress={() => setMessage(s)} />)}
      </View>

      {status !== 'AVAILABLE' ? (
        <View style={{ gap: 8 }}>
          <T v="overline">Until</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Later today" selected={untilKey === 'later'} onPress={() => pick('later')} />
            <Chip label="Tomorrow" selected={untilKey === 'tomorrow'} onPress={() => pick('tomorrow')} />
            <Chip label="Pick date and time" selected={untilKey === 'pick'} onPress={() => pick('pick')} />
            <Chip label="Until I change it" selected={untilKey === 'none'} onPress={() => pick('none')} />
          </View>
          {until ? <T v="caption">Back to Available on {formatDateTime(until.toISOString())}</T> : null}
        </View>
      ) : null}

      <Button size="lg" title="Update status" loading={save.isPending} onPress={() => save.mutate()} />

      <View style={{ height: 1, backgroundColor: colors.divider }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="heading" color={colors.text}>Show my profile to customers</T>
          <T v="caption">{presence.isPaused ? 'Your profile is hidden. Your subscription and reviews are safe.' : 'Turn off to pause. Your subscription and reviews stay safe.'}</T>
        </View>
        <Switch accessibilityLabel="Show my profile to customers" value={!presence.isPaused} disabled={visible.isPending} onValueChange={(v) => visible.mutate(v)} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
      </View>
      <DateTimeSheet visible={picker} title="Back on" onClose={() => setPicker(false)} onPick={(d) => { setUntil(d); setPicker(false); }} />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: '45%', gap: 4, padding: 14 }}>
      <T style={{ fontSize: 24, lineHeight: 30 }} weight={700} color={colors.navy}>{value}</T>
      <T v="caption">{label}</T>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { me } = useSession();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.providers.dashboard() });
  const liveQ = useQuery({ queryKey: ['live-incoming'], queryFn: () => api.liveRequests.incoming(), refetchInterval: 30_000 });
  const liveCount = (liveQ.data ?? []).filter((r) => r.myResponse?.status !== 'INTERESTED').length;
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 }}>
      <View style={{ flex: 1 }}><T v="caption">Welcome back</T><T v="title" numberOfLines={1}>{me?.name ?? 'Dashboard'}</T></View>
      <BellButton />
    </View>
  );
  return (
    <Screen header={header} onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(d) => (
          <>
            <StatusCard presence={d.presence} />
            <SubscriptionBanner sub={d.subscription} onPress={() => router.push(d.subscription ? '/subscription' : '/onboarding?step=7')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat label="Profile views, 30 days" value={d.profileViews30d} />
              <Stat label="Chats started" value={d.chatsStarted30d} />
              <Stat label="Phone reveals" value={d.phoneReveals30d} />
              <Stat label="Saves" value={d.saves30d} />
            </View>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="heading" color={colors.text}>Profile completeness</T><T v="heading">{d.completeness}%</T></View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, d.completeness)}%`, height: 8, backgroundColor: colors.teal700 }} /></View>
              {d.missingForPublish.length ? (
                <View style={{ gap: 4 }}>
                  <T v="caption">To go live you still need:</T>
                  {d.missingForPublish.map((m) => <T key={m} v="caption" color={colors.text}>{'•'} {m}</T>)}
                  <Button kind="ghost" size="sm" title="Complete profile" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={() => router.push('/p-profile')} />
                </View>
              ) : <T v="caption">{d.isPublished ? 'Your profile is complete and published.' : 'Your profile is ready to publish.'}</T>}
            </Card>
            <Card onPress={() => router.push('/live/incoming')} accessibilityLabel="See live requests from customers">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}><Zap size={20} color="#fff" /></View>
                <View style={{ flex: 1 }}><T v="heading" color={colors.text}>Live requests</T><T v="caption">Customers who need help right now</T></View>
                {liveCount > 0 ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T v="caption" color="#fff" weight={700}>{liveCount}</T></View> : <ChevronRight size={20} color={colors.textMuted} />}
              </View>
            </Card>
            <Card onPress={() => router.push('/my-jobs')} accessibilityLabel="Manage your job postings">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}><Briefcase size={20} color={colors.teal700} /></View>
                <View style={{ flex: 1 }}><T v="heading" color={colors.text}>Hiring help?</T><T v="caption">Post a job and reach seekers nearby</T></View>
                <ChevronRight size={20} color={colors.textMuted} />
              </View>
            </Card>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
