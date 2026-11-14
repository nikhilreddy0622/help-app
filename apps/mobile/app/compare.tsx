import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Screen } from '@/components/Screen';
import { Avatar, AvailabilityPill, Button, EmptyState, Rating, Skeleton, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useCompare } from '@/lib/compare';
import { distanceLabel, priceLabel } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Compare() {
  const router = useRouter();
  const { items, toggle } = useCompare();
  const results = useQueries({ queries: items.map((p) => ({ queryKey: ['provider', p.slug], queryFn: () => api.providers.bySlug(p.slug) })) });
  if (items.length < 2) return <Screen title="Compare"><EmptyState title="Pick two or three professionals" body="Tap Compare on search results or saved professionals to line them up side by side." actionLabel="Browse" onAction={() => router.replace('/explore')} /></Screen>;

  const full = results.map((r) => (r.data && !('redirectTo' in r.data) ? r.data : null));
  const col = 150;
  const rows: { label: string; cell: (i: number) => React.ReactNode }[] = [
    { label: 'Rating', cell: (i) => <Rating avg={items[i]!.ratingAvg} count={items[i]!.ratingCount} /> },
    { label: 'Reviews', cell: (i) => <T>{items[i]!.ratingCount}</T> },
    { label: 'Experience', cell: (i) => <T>{items[i]!.experienceYears} yrs</T> },
    { label: 'Distance', cell: (i) => <T>{distanceLabel(items[i]!.distanceKm) || '—'}</T> },
    { label: 'Starting price', cell: (i) => <T weight={600}>{items[i]!.startingPricePaise != null ? priceLabel(items[i]!.startingPricePaise, items[i]!.startingPriceUnit) : '—'}</T> },
    { label: 'Status', cell: (i) => <View style={{ gap: 4, alignItems: 'center' }}><AvailabilityPill p={items[i]!} /><T v="caption" align="center" style={{ fontSize: 12 }}>{items[i]!.statusMessage ?? ''}</T></View> },
    { label: 'Member since', cell: (i) => (results[i]?.isPending ? <Skeleton w={40} h={14} /> : <T>{full[i] ? new Date(full[i]!.memberSince).getFullYear() : '—'}</T>) },
    { label: 'Reply time', cell: (i) => (results[i]?.isPending ? <Skeleton w={50} h={14} /> : <T>{full[i]?.responseMinutes != null ? `~${full[i]!.responseMinutes} min` : '—'}</T>) },
    { label: 'Verified', cell: (i) => (
      <View style={{ gap: 6 }}>
        {items[i]!.badges.mobile ? <Badge kind="mobile" /> : null}
        {items[i]!.badges.identity ? <Badge kind="identity" /> : null}
        {items[i]!.badges.qualification ? <Badge kind="qualification" /> : null}
        {!items[i]!.badges.mobile && !items[i]!.badges.identity && !items[i]!.badges.qualification ? <T color={colors.textMuted}>None yet</T> : null}
      </View>) },
  ];
  return (
    <Screen title="Compare" scroll={false}>
      <ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          <View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 96 }} />
              {items.map((p) => (
                <View key={p.id} style={{ width: col, alignItems: 'center', gap: 6, paddingHorizontal: 6 }}>
                  <Avatar name={p.displayName} url={p.avatarUrl} size={48} />
                  <T v="label" weight={600} align="center" numberOfLines={2}>{p.displayName}</T>
                  <T v="caption" align="center" numberOfLines={1}>{p.categoryName}</T>
                  <Button kind="ghost" size="sm" title="Remove" onPress={() => toggle(p)} />
                </View>
              ))}
            </View>
            {rows.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderTopWidth: 1, borderTopColor: colors.border }}>
                <T v="overline" style={{ width: 96, fontSize: 11 }}>{r.label}</T>
                {items.map((p, i) => <View key={p.id} style={{ width: col, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 }}>{r.cell(i)}</View>)}
              </View>
            ))}
            <View style={{ flexDirection: 'row', paddingTop: 12 }}>
              <View style={{ width: 96 }} />
              {items.map((p) => <View key={p.id} style={{ width: col, paddingHorizontal: 6 }}><Button size="sm" title="View profile" onPress={() => router.push(`/provider/${p.slug}`)} /></View>)}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </Screen>
  );
}
