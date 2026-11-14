import React from 'react';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/Logo';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Button, Card, EmptyState, ListSkeleton, Pill, T } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatINR } from '@/lib/format';
import { colors } from '@/lib/theme';

function Line({ k, v }: { k: string; v: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><T color={colors.textMuted}>{k}</T><T weight={500} style={{ flexShrink: 1, textAlign: 'right' }}>{v}</T></View>;
}

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['payments'], queryFn: () => api.payments.mine() });
  return (
    <Screen title="Receipt" contentStyle={{ padding: 16, gap: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={1} />}>
        {(list) => {
          const p = list.find((x) => x.id === id);
          if (!p) return <EmptyState title="Receipt not found" body="It may have been removed." />;
          const ok = /paid|captured|success/i.test(p.status);
          const text = `help receipt\nAmount: ${formatINR(p.amountPaise)}\nStatus: ${p.status}\nDate: ${p.paidAt ? formatDateTime(p.paidAt) : 'Not paid'}\nReference: ${p.id}`;
          return (
            <>
              <Card style={{ gap: 16 }}>
                <Logo size={26} />
                <View style={{ gap: 4 }}>
                  <T v="caption">Amount</T>
                  <T style={{ fontSize: 32, lineHeight: 38 }} weight={700} color={colors.navy}>{formatINR(p.amountPaise)}</T>
                  <Pill label={p.status} bg={ok ? colors.successBg : colors.warningBg} fg={ok ? colors.successFg : colors.warningFg} />
                </View>
                <View style={{ height: 1, backgroundColor: colors.divider }} />
                <Line k="Date" v={p.paidAt ? formatDateTime(p.paidAt) : 'Not paid'} />
                {p.method ? <Line k="Method" v={p.method} /> : null}
                <Line k="Description" v="help professional subscription" />
                <Line k="Reference" v={p.id} />
              </Card>
              <T v="caption">Need a GST invoice or have a payment problem? Create a Payment ticket from Help.</T>
              <Button kind="secondary" title="Share receipt" onPress={() => Share.share({ message: text })} />
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
