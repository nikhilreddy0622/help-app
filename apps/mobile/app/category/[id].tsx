import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SearchX } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Chip, EmptyState, ErrorState, ListSkeleton, ProviderCard, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useCategories, useSaved } from '@/lib/hooks';
import { useLocation } from '@/lib/location';
import { colors } from '@/lib/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loc = useLocation();
  const saved = useSaved();
  const cats = useCategories();
  const [sub, setSub] = useState<string | null>(null);
  const group = cats.data?.find((c) => c.id === id);
  const subs = (cats.data ?? []).filter((c) => c.parentId === id);
  const categoryId = sub ?? id!;
  const q = useQuery({
    queryKey: ['category-search', categoryId, loc.coords.lat, loc.coords.lng],
    queryFn: () => api.discovery.search({ lat: loc.coords.lat, lng: loc.coords.lng, categoryId, radiusKm: 25, sort: 'relevance' }),
  });
  return (
    <Screen title={group?.name ?? 'Services'} onRefresh={async () => { await Promise.all([q.refetch(), cats.refetch()]); }} contentStyle={{ padding: 16, gap: 16 }}>
      {subs.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All" selected={sub === null} onPress={() => setSub(null)} />
          {subs.map((s) => <Chip key={s.id} label={s.name} count={s.providerCount} selected={sub === s.id} onPress={() => setSub(s.id)} />)}
        </ScrollView>
      ) : null}
      {q.isPending ? <ListSkeleton count={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? (
        <EmptyState icon={<SearchX size={28} color={colors.textMuted} />} title="No professionals here yet" body="Try another category or widen your location." actionLabel="Change location" onAction={() => router.push('/location')} />
      ) : (
        <View style={{ gap: 12 }}>
          <T v="caption">{q.data.items.length}{q.data.meta.nextCursor ? '+' : ''} professional{q.data.items.length === 1 ? '' : 's'} near you</T>
          {q.data.items.map((p) => <ProviderCard key={p.id} p={p} onPress={() => router.push(`/provider/${p.slug}`)} saved={saved.isSaved(p.id)} onToggleSave={() => saved.toggle(p.id)} />)}
          <Chip label="See more in Explore" onPress={() => router.push({ pathname: '/explore', params: { categoryId, categoryName: sub ? subs.find((s) => s.id === sub)?.name : group?.name } })} />
        </View>
      )}
    </Screen>
  );
}
