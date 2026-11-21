import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Map from '@/components/Map';
import { ChevronLeft, SearchX, Search, SlidersHorizontal, X } from 'lucide-react-native';
import type { DiscoverySearchInput } from '@help/validation';
import { Button, Card, Chip, EmptyState, ErrorState, Input, ListSkeleton, ProviderCard, Segmented, Sheet, T } from '@/components/ui';
import { CountDot } from '@/components/Screen';
import { api } from '@/lib/api';
import { useLocation } from '@/lib/location';
import { useCompare } from '@/lib/compare';
import { CompareBar } from '@/components/CompareBar';
import { useSession } from '@/lib/session';
import { useSaved } from '@/lib/hooks';
import { colors, shadowSm } from '@/lib/theme';
import { formatINR } from '@/lib/format';

interface Filters {
  radiusKm: number; minRating?: number; minExperience?: number; maxPriceRupees?: number;
  availableNow: boolean; verifiedOnly: boolean; language?: string; serviceMode?: 'ONSITE' | 'REMOTE';
  sort: 'relevance' | 'distance' | 'rating' | 'price';
}
const DEFAULTS: Filters = { radiusKm: 10, availableNow: false, verifiedOnly: false, sort: 'relevance' };
const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali'];

function count(f: Filters): number {
  return [f.radiusKm !== 10, f.minRating, f.minExperience, f.maxPriceRupees, f.availableNow, f.verifiedOnly, f.language, f.serviceMode, f.sort !== 'relevance'].filter(Boolean).length;
}

/** Search + filters + list/map. In the Explore tab, or standalone as category results (with a back button). */
export default function Explore({ standalone }: { standalone?: boolean }) {
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string; availableNow?: string; q?: string; sort?: string }>();
  const router = useRouter();
  const loc = useLocation();
  const saved = useSaved();
  const cmp = useCompare();
  const [text, setText] = useState(params.q ?? '');
  const [query, setQuery] = useState(params.q ?? '');
  const [filters, setFilters] = useState<Filters>({ ...DEFAULTS, availableNow: params.availableNow === '1', sort: (['distance', 'rating', 'price'] as const).find((k) => k === params.sort) ?? 'relevance' });
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId);
  const [categoryName, setCategoryName] = useState<string | undefined>(params.categoryName);
  const { signedIn } = useSession();
  const recent = useQuery({ queryKey: ['recent-searches'], queryFn: () => api.users.recentSearches(), enabled: signedIn });
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheet, setSheet] = useState(false);

  React.useEffect(() => { const t = setTimeout(() => setQuery(text.trim()), 350); return () => clearTimeout(t); }, [text]);

  const input = useMemo(() => {
    const i: Partial<DiscoverySearchInput> & { lat: number; lng: number } = {
      lat: loc.coords.lat, lng: loc.coords.lng, radiusKm: filters.radiusKm, sort: filters.sort,
      q: query || undefined, categoryId, minRating: filters.minRating, minExperience: filters.minExperience,
      maxPricePaise: filters.maxPriceRupees ? filters.maxPriceRupees * 100 : undefined,
      availableNow: filters.availableNow || undefined, verifiedOnly: filters.verifiedOnly || undefined,
      language: filters.language, serviceMode: filters.serviceMode,
    };
    return i;
  }, [loc.coords, filters, query, categoryId]);

  const q = useInfiniteQuery({
    queryKey: ['search', input],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.discovery.search({ ...input, cursor: pageParam }),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const more = !!q.hasNextPage;
  const n = count(filters);
  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {categoryId ? <Chip selected label={categoryName ?? 'Category'} icon={<X size={14} color={colors.teal800} />} onPress={() => { setCategoryId(undefined); setCategoryName(undefined); }} /> : null}
      <Chip selected={filters.radiusKm !== 10} label={`Within ${filters.radiusKm} km`} onPress={() => setSheet(true)} />
      <Chip selected={filters.availableNow} label="Available now" onPress={() => set({ availableNow: !filters.availableNow })} />
      <Chip selected={filters.minRating === 4} label={'4★ & up'} onPress={() => set({ minRating: filters.minRating === 4 ? undefined : 4 })} />
      <Chip selected={filters.verifiedOnly} label="Verified" onPress={() => set({ verifiedOnly: !filters.verifiedOnly })} />
      <Chip selected={!!filters.maxPriceRupees} label="Price" onPress={() => setSheet(true)} />
    </ScrollView>
  );

  const renderItem = useCallback(({ item }: { item: (typeof items)[number] }) => (
    <ProviderCard p={item} onPress={() => router.push(`/provider/${item.slug}`)} saved={saved.isSaved(item.id)} onToggleSave={() => saved.toggle(item.id)} compared={cmp.has(item.id)} onToggleCompare={() => cmp.toggle(item)} />
  ), [router, saved, cmp]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={standalone ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      <View style={[{ backgroundColor: colors.white, paddingTop: 8, paddingBottom: 12, gap: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 2 }, shadowSm]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: standalone ? 6 : 16 }}>
          {standalone ? <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={26} color={colors.text} /></Pressable> : null}
          <T v="title" numberOfLines={1} style={{ flex: 1, fontSize: 22 }}>{standalone ? (categoryName ?? (filters.sort === 'rating' ? 'Top rated near you' : 'Professionals')) : 'Explore'}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 8 }}>
          <View style={{ width: 8 }} />
          <View style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
            <Search size={19} color={colors.brand} strokeWidth={2.5} />
            <TextInput
              value={text} onChangeText={setText} placeholder={categoryName ? `Search in ${categoryName}` : 'Search services or names'} placeholderTextColor={colors.textMuted} returnKeyType="search" accessibilityLabel="Search"
              style={{ flex: 1, height: 48, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.text }}
            />
          </View>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" accessibilityLabel={`All filters${n ? `, ${n} applied` : ''}`} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: n ? colors.tealTint : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <SlidersHorizontal size={20} color={n ? colors.brand : colors.text} />
            {n ? <CountDot n={n} /> : null}
          </Pressable>
        </View>
        {chips}
        {!text && recent.data?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
            <T v="caption">Recent</T>
            {recent.data.slice(0, 6).map((r) => <Chip key={r.id} label={r.query} onPress={() => { setText(r.query); setQuery(r.query); }} />)}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
        <T v="caption" style={{ flex: 1 }}>
          {q.isPending ? 'Searching…' : <><T v="caption" weight={600} color={colors.text}>{items.length}{more ? '+' : ''} professional{items.length === 1 ? '' : 's'}</T> {'·'} {filters.sort === 'relevance' ? 'best match' : filters.sort}</>}
        </T>
        <View style={{ width: 140 }}>
          <Segmented compact value={view} onChange={setView} options={[{ key: 'list', label: 'List' }, { key: 'map', label: 'Map' }]} />
        </View>
      </View>

      {view === 'list' ? (
        q.isPending ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
          <FlatList
            data={items} keyExtractor={(p) => p.id} renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}
            refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={async () => { await q.refetch(); }} tintColor={colors.teal700} />}
            onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }} onEndReachedThreshold={0.5}
            ListFooterComponent={q.isFetchingNextPage ? <ListSkeleton count={1} /> : undefined}
            ListEmptyComponent={<EmptyState icon={<SearchX size={28} color={colors.textMuted} />} title="No professionals found" body="Try a wider distance, remove a filter, or search a different service." actionLabel={n ? 'Clear filters' : undefined} onAction={() => setFilters(DEFAULTS)} />}
          />
        )
      ) : (
        <View style={{ flex: 1 }}>
          {/* Pins use the ~1 km approximate area; exact locations stay private. */}
          <Map
            style={{ flex: 1 }}
            center={{ lat: loc.coords.lat, lng: loc.coords.lng }}
            radiusKm={filters.radiusKm}
            zoom={12}
            fitPins
            pins={items.filter((p) => p.area).map((p) => ({ ...p.area!, id: p.slug, title: p.displayName, subtitle: [p.categoryName, p.distanceKm != null ? `${p.distanceKm} km away` : null].filter(Boolean).join(' · ') }))}
            onOpen={(slug) => router.push(`/provider/${slug}`)}
          />
          {q.isPending ? null : items.length === 0 ? (
            <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <Card><T color={colors.textMuted}>No professionals in this area. Try a wider distance.</T></Card>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ position: 'absolute', bottom: 12, left: 0, right: 0 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} snapToInterval={290} decelerationRate="fast">
              {items.slice(0, 20).map((p) => (
                <View key={p.id} style={{ width: 280 }}><ProviderCard p={p} onPress={() => router.push(`/provider/${p.slug}`)} /></View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <CompareBar />
      <FilterSheet visible={sheet} onClose={() => setSheet(false)} value={filters} onApply={(f) => { setFilters(f); setSheet(false); }} />
    </SafeAreaView>
  );
}

function Opt<K extends string | number | undefined>({ label, options, value, onChange }: { label: string; options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <T v="overline">{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => <Chip key={String(o.key)} label={o.label} selected={o.key === value} onPress={() => onChange(o.key)} />)}
      </View>
    </View>
  );
}

function FilterSheet({ visible, onClose, value, onApply }: { visible: boolean; onClose: () => void; value: Filters; onApply: (f: Filters) => void }) {
  const [f, setF] = useState(value);
  const [custom, setCustom] = useState('');
  React.useEffect(() => { if (visible) { setF(value); setCustom([1, 3, 5, 10, 25].includes(value.radiusKm) ? '' : String(value.radiusKm)); } }, [visible, value]);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));
  return (
    <Sheet
      visible={visible} onClose={onClose} title="Filters"
      footer={<View style={{ flexDirection: 'row', gap: 12 }}>
        <Button kind="secondary" title="Reset" style={{ flex: 1 }} onPress={() => { setF(DEFAULTS); setCustom(''); }} />
        <Button title="Show results" style={{ flex: 2 }} onPress={() => onApply(f)} />
      </View>}
    >
      <Opt label="Distance" value={[1, 3, 5, 10, 25].includes(f.radiusKm) ? f.radiusKm : -1} onChange={(k) => { if (k === -1) return; setCustom(''); set({ radiusKm: k }); }} options={[1, 3, 5, 10, 25].map((k) => ({ key: k as number, label: `${k} km` }))} />
      <Input label="Custom distance (km)" keyboardType="number-pad" value={custom} placeholder="e.g. 15" onChangeText={(t) => { const d = t.replace(/\D/g, ''); setCustom(d); const n = Number(d); if (n >= 1 && n <= 100) set({ radiusKm: n }); }} />
      <Opt label="Rating" value={f.minRating} onChange={(k) => set({ minRating: k })} options={[{ key: undefined, label: 'Any' }, { key: 3, label: '3★ & up' }, { key: 4, label: '4★ & up' }, { key: 4.5, label: '4.5★ & up' }]} />
      <Opt label="Experience" value={f.minExperience} onChange={(k) => set({ minExperience: k })} options={[{ key: undefined, label: 'Any' }, { key: 2, label: '2+ yrs' }, { key: 5, label: '5+ yrs' }, { key: 10, label: '10+ yrs' }]} />
      <Input label={'Max price (₹)'} keyboardType="number-pad" value={f.maxPriceRupees ? String(f.maxPriceRupees) : ''} placeholder="No limit" hint={f.maxPriceRupees ? `Up to ${formatINR(f.maxPriceRupees * 100)}` : undefined} onChangeText={(t) => set({ maxPriceRupees: t.replace(/\D/g, '') ? Number(t.replace(/\D/g, '')) : undefined })} />
      <View style={{ gap: 10 }}>
        <T v="overline">Availability and trust</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Available now" selected={f.availableNow} onPress={() => set({ availableNow: !f.availableNow })} />
        <Chip label="Verified only" selected={f.verifiedOnly} onPress={() => set({ verifiedOnly: !f.verifiedOnly })} />
        </View>
      </View>
      <Opt label="Language" value={f.language} onChange={(k) => set({ language: k })} options={[{ key: undefined, label: 'Any' }, ...LANGS.map((l) => ({ key: l as string | undefined, label: l }))]} />
      <Opt label="Service mode" value={f.serviceMode} onChange={(k) => set({ serviceMode: k })} options={[{ key: undefined, label: 'Any' }, { key: 'ONSITE' as const, label: 'Offline (visits)' }, { key: 'REMOTE' as const, label: 'Online' }]} />
      <Opt label="Sort by" value={f.sort} onChange={(k) => set({ sort: k })} options={[{ key: 'relevance' as const, label: 'Best match' }, { key: 'distance' as const, label: 'Nearest' }, { key: 'rating' as const, label: 'Top rated' }, { key: 'price' as const, label: 'Lowest price' }]} />
    </Sheet>
  );
}
