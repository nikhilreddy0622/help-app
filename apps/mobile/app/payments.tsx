import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react-native';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Card, EmptyState, ListSkeleton, Pill, T } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Payments() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['payments'], queryFn: () => api.payments.mine() });
  return (
    <Screen title="Payment history" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 12 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(list) => list.length === 0 ? <EmptyState icon={<Receipt size={28} color={colors.textMuted} />} title="No payments yet" body="Your subscription payments and invoices will appear here." /> : (
          <>
            {list.map((p) => {
              const ok = /paid|captured|success/i.test(p.status);
              return (
                <Card key={p.id} onPress={() => router.push(`/receipt/${p.id}`)} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <T v="heading">{formatINR(p.amountPaise)}</T>
                    <Pill label={p.status} bg={ok ? colors.successBg : colors.warningBg} fg={ok ? colors.successFg : colors.warningFg} />
                  </View>
                  <T v="caption">{p.paidAt ? formatDate(p.paidAt) : 'Not paid'}{p.method ? ` · ${p.method}` : ''}</T>
                </Card>
              );
            })}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
