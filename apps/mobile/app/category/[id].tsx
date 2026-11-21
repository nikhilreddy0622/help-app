import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import type { Category } from '@help/types';
import { CatIcon } from '@/components/CategoryIcon';
import { EmptyState, ListSkeleton, Press, T } from '@/components/ui';
import { useCategories } from '@/lib/hooks';
import { colors, shadowSm, tileColor } from '@/lib/theme';

function ServiceRow({ s, onPress, last, ink }: { s: Category; onPress: () => void; last: boolean; ink: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={s.name} scaleTo={0.99}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceMuted : colors.white, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider })}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ink, opacity: 0.6 }} />
      <T style={{ flex: 1 }} weight={600} color={colors.text}>{s.name}</T>
      {s.providerCount ? <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: colors.successBg, justifyContent: 'center' }}><T v="micro" color={colors.successFg}>{s.providerCount} near you</T></View> : null}
      <ChevronRight size={18} color={colors.textMuted} />
    </Press>
  );
}

/** Step 1 of browsing: a category's services, grouped by heading. Professionals appear after picking a service. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cats = useCategories();
  const [term, setTerm] = useState('');
  const group = cats.data?.find((c) => c.id === id);
  const tone = tileColor(group?.slug ?? '');
  const all = useMemo(() => (cats.data ?? []).filter((c) => c.parentId === id), [cats.data, id]);
  const sections = useMemo(() => {
    const t = term.trim().toLowerCase();
    const map = new Map<string, Category[]>();
    for (const s of all) {
      if (t && !s.name.toLowerCase().includes(t) && !s.keywords?.some((k) => k.toLowerCase().includes(t))) continue;
      const k = s.subgroup ?? 'Services';
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [all, term]);
  const open = (s: Category) => router.push({ pathname: '/results', params: { categoryId: s.id, categoryName: s.name } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ backgroundColor: tone.bg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 22 }}>
          <SafeAreaView edges={['top']} style={{ paddingHorizontal: 12, paddingTop: 4 }}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
          </SafeAreaView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="display" style={{ fontSize: 26, lineHeight: 31 }}>{group?.name ?? 'Services'}</T>
              <T weight={600} color={tone.fg}>{all.length} services{group?.providerCount ? ` · ${group.providerCount} pros near you` : ''}</T>
            </View>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' }}>
              <CatIcon name={group?.icon} size={38} color={tone.fg} />
            </View>
          </View>
          {all.length > 8 ? (
            <View style={[{ marginHorizontal: 16, marginTop: 18, height: 48, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }, shadowSm]}>
              <Search size={19} color={tone.fg} strokeWidth={2.5} />
              <TextInput value={term} onChangeText={setTerm} placeholder={`Search in ${group?.name ?? 'this category'}`} placeholderTextColor={colors.textMuted} accessibilityLabel="Search services"
                style={{ flex: 1, height: 48, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.text }} />
            </View>
          ) : null}
        </View>

        <View style={{ padding: 16, gap: 18 }}>
          {cats.isPending ? <ListSkeleton count={4} /> : sections.length === 0 ? (
            <EmptyState title="No matching services" body="Try a different word." />
          ) : sections.map(([heading, list]) => (
            <View key={heading} style={{ gap: 10 }}>
              {sections.length > 1 ? <T v="heading" style={{ paddingHorizontal: 4 }}>{heading}</T> : null}
              <View style={[{ borderRadius: 20, overflow: 'hidden', backgroundColor: colors.white }, shadowSm]}>
                {list.map((s, i) => <ServiceRow key={s.id} s={s} ink={tone.fg} onPress={() => open(s)} last={i === list.length - 1} />)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
