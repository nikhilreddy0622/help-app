import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionStatus } from '@help/types';
import { QueryBoundary, Screen } from '@/components/Screen';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { Button, Card, EmptyState, ListSkeleton, Pill, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { colors } from '@/lib/theme';

const STATUS: Record<SubscriptionStatus, [string, string, string]> = {
  INCOMPLETE: ['Not started', colors.surfaceMuted, '#334155'], PENDING: ['Confirming', colors.infoBg, colors.infoFg], ACTIVE: ['Active', colors.successBg, colors.successFg],
  PAST_DUE: ['Payment due', colors.warningBg, colors.warningFg], CANCELLED: ['Cancelled', colors.surfaceMuted, '#334155'], EXPIRED: ['Expired', colors.surfaceMuted, '#334155'], HALTED: ['Paused', colors.dangerBg, colors.danger],
};

export default function Subscription() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine() });
  const cancel = useMutation({
    mutationFn: () => api.subscriptions.cancel(),
    onSuccess: (d) => { qc.setQueryData(['subscription'], d); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: (e) => Alert.alert('Could not cancel', errorMessage(e)),
  });
  const confirmCancel = (end: string | null) => Alert.alert(
    'Turn off renewal?',
    end ? `You have already paid for this period. Your plan and visibility stay active until ${formatDate(end)}, and you will not be charged again. No refund is given for the remaining time.` : 'Your plan will not renew.',
    [{ text: 'Keep renewing', style: 'cancel' }, { text: 'Turn off renewal', style: 'destructive', onPress: () => cancel.mutate() }],
  );
  return (
    <Screen title="Subscription and plan" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>
        {(s) => !s ? (
          <EmptyState title="No active plan" body="Choose a plan to make your profile visible and be contacted by customers." actionLabel="Choose a plan" onAction={() => router.push('/onboarding?step=7')} />
        ) : (
          <>
            <SubscriptionBanner sub={s} onPress={() => undefined} />
            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="heading">{s.plan.name}</T>
                <Pill label={STATUS[s.status][0]} bg={STATUS[s.status][1]} fg={STATUS[s.status][2]} />
              </View>
              <T v="title">{formatINR(s.plan.pricePaise)}<T v="caption"> / {s.plan.interval === 'MONTHLY' ? 'month' : 'year'}</T></T>
              {s.currentPeriodEnd ? <T color={colors.textSubtle}>{s.cancelAtPeriodEnd ? 'Paid through' : 'Renews on'} {formatDate(s.currentPeriodEnd)}</T> : null}
              {s.plan.features.map((f) => <T key={f} v="caption">{'•'} {f}</T>)}
            </Card>
            {s.status === 'ACTIVE' && !s.cancelAtPeriodEnd ? <Button kind="danger" title="Cancel renewal" loading={cancel.isPending} onPress={() => confirmCancel(s.currentPeriodEnd)} /> : null}
            {s.cancelAtPeriodEnd && s.entitled ? <T v="caption">Renewal is off. Your profile stays live until {formatDate(s.currentPeriodEnd)}.</T> : null}
            {!s.entitled || s.status === 'PAST_DUE' ? <Button title="Renew or change plan" onPress={() => router.push('/onboarding?step=7')} /> : null}
            <Button kind="secondary" title="Payment history" onPress={() => router.push('/payments')} />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
