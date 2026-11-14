import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { QueryBoundary } from '@/components/Screen';
import { Card, EmptyState, ListSkeleton, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

type Days = 7 | 30 | 90;

function Bars({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const w = 300; const h = 80; const max = Math.max(1, ...values);
  const bw = w / Math.max(1, values.length);
  return (
    <View accessible accessibilityLabel={`Chart, total ${values.reduce((a, b) => a + b, 0)}`}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {values.map((v, i) => { const bh = Math.max(v ? 2 : 0, (v / max) * (h - 4)); return <Rect key={i} x={i * bw + bw * 0.15} y={h - bh} width={bw * 0.7} height={bh} rx={1.5} fill={color} />; })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" style={{ fontSize: 11 }}>{labels[0]}</T><T v="caption" style={{ fontSize: 11 }}>{labels[labels.length - 1]}</T>
      </View>
    </View>
  );
}

export default function Insights() {
  const [days, setDays] = useState<Days>(30);
  const q = useQuery({ queryKey: ['insights', days], queryFn: () => api.providers.insights(days) });
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <T v="title">Insights</T>
        <Segmented value={days} onChange={setDays} options={[{ key: 7, label: '7 days' }, { key: 30, label: '30 days' }, { key: 90, label: '90 days' }]} />
        <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
          {(d) => {
            const labels = d.series.map((s) => fmt(s.day));
            const charts: [string, number[], number][] = [
              ['Profile views', d.series.map((s) => s.views), d.totals.views], ['Chats started', d.series.map((s) => s.chats), d.totals.chats],
              ['Phone reveals', d.series.map((s) => s.phoneReveals), d.totals.phoneReveals], ['Saves', d.series.map((s) => s.saves), d.totals.saves],
            ];
            return (
              <>
                {charts.map(([title, vals, total]) => (
                  <Card key={title} style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><T v="heading" color={colors.text}>{title}</T><T style={{ fontSize: 22 }} weight={700} color={colors.navy}>{total}</T></View>
                    {vals.length ? <Bars values={vals} labels={labels} color={colors.teal700} /> : null}
                  </Card>
                ))}
                <Card style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><T v="caption">Replied within 24h</T><T style={{ fontSize: 22 }} weight={700} color={colors.navy}>{d.responseRate != null ? `${Math.round(d.responseRate * (d.responseRate <= 1 ? 100 : 1))}%` : '—'}</T></View>
                  <View style={{ flex: 1 }}><T v="caption">Typical first reply</T><T style={{ fontSize: 22 }} weight={700} color={colors.navy}>{d.responseMinutes != null ? `${d.responseMinutes} min` : '—'}</T></View>
                </Card>
                <Card style={{ gap: 8 }}>
                  <T v="heading" color={colors.text}>Top search terms</T>
                  {d.topSearchTerms.length === 0 ? <T color={colors.textMuted}>Search terms that led customers to you will appear here.</T> : d.topSearchTerms.map((t) => (
                    <View key={t.term} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T>{t.term}</T><T color={colors.textMuted}>{t.count}</T></View>
                  ))}
                </Card>
                {d.totals.views === 0 && d.totals.impressions === 0 ? <EmptyState title="No activity yet" body="Keep your status current and your profile complete to get seen." /> : null}
              </>
            );
          }}
        </QueryBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
