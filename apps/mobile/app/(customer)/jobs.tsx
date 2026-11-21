import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Briefcase, MapPin, Search, SearchX } from 'lucide-react-native';
import type { JobType } from '@help/types';
import { TabHeader } from '@/components/Screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip, EmptyState, ErrorState, ListSkeleton, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useLocation } from '@/lib/location';
import { JOB_TYPE_LABEL, jobPayLabel, relativeTime } from '@/lib/format';
import { colors, tileColor } from '@/lib/theme';

const TYPES: (JobType | 'ALL')[] = ['ALL', 'FULL_TIME', 'PART_TIME', 'GIG'];

export default function Jobs() {
  const router = useRouter();
  const loc = useLocation();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<JobType | 'ALL'>('ALL');

  const q = useInfiniteQuery({
    queryKey: ['jobs', loc.coords, query, type],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.jobs.search({ lat: loc.coords.lat, lng: loc.coords.lng, radiusKm: 25, q: query || undefined, jobType: type === 'ALL' ? undefined : type, cursor: pageParam }),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <TabHeader title="Jobs near you" subtitle={loc.place ? `Work posted by pros around ${loc.label.split(',')[0]}` : 'Work posted by pros near you'} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <View style={{ height: 50, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border }}>
          <Search size={19} color={colors.brand} strokeWidth={2.5} />
          <TextInput
            value={term} onChangeText={setTerm} onSubmitEditing={() => setQuery(term.trim())} returnKeyType="search"
            placeholder="Search roles, e.g. electrician" placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search jobs"
            style={{ flex: 1, height: 50, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.text }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((tt) => (
            <Chip key={tt} selected={type === tt} label={tt === 'ALL' ? 'All' : JOB_TYPE_LABEL[tt]} onPress={() => setType(tt)} />
          ))}
        </View>
      </View>

      {q.isPending ? (
        <View style={{ padding: 16 }}><ListSkeleton count={4} /></View>
      ) : q.isError ? (
        <View style={{ padding: 16 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon={<SearchX size={28} color={colors.textMuted} />} title="No jobs here yet" body="Try a wider search or remove the filter." />}
          renderItem={({ item: j }) => (
            <Card onPress={() => router.push(`/job/${j.id}`)} accessibilityLabel={`${j.title}, ${jobPayLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}`}>
              <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tileColor(j.title).bg, alignItems: 'center', justifyContent: 'center' }}><Briefcase size={24} color={tileColor(j.title).fg} /></View>
              <View style={{ gap: 6, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <T v="heading" style={{ flex: 1 }} numberOfLines={2}>{j.title}</T>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.tealTint }}>
                    <T v="caption" color={colors.teal800}>{JOB_TYPE_LABEL[j.jobType]}</T>
                  </View>
                </View>
                <T weight={800} color={colors.rating}>{jobPayLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Briefcase size={13} color={colors.textMuted} />
                  <T v="caption">{j.providerName}</T>
                  {j.locality || j.city ? <><MapPin size={13} color={colors.textMuted} /><T v="caption">{[j.locality, j.city].filter(Boolean).join(', ')}{j.distanceKm != null ? ` · ${j.distanceKm} km` : ''}</T></> : null}
                </View>
                <T v="caption" color={colors.textMuted}>{j.openings > 1 ? `${j.openings} openings · ` : ''}Posted {relativeTime(j.createdAt)}</T>
              </View>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
