import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { CatIcon } from '@/components/CategoryIcon';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Card, EmptyState, ListSkeleton, T } from '@/components/ui';
import { useCategories } from '@/lib/hooks';
import { colors } from '@/lib/theme';

export default function AllServices() {
  const router = useRouter();
  const q = useCategories();
  const [term, setTerm] = useState('');
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const all = q.data ?? [];
    return all.filter((c) => !c.parentId).map((g) => {
      const subs = all.filter((c) => c.parentId === g.id);
      const hit = !t || g.name.toLowerCase().includes(t);
      return { g, subs: hit ? subs : subs.filter((s) => s.name.toLowerCase().includes(t)), show: hit || subs.some((s) => s.name.toLowerCase().includes(t)) };
    }).filter((r) => r.show);
  }, [q.data, t]);
  return (
    <Screen title="All services" contentStyle={{ padding: 16, gap: 16 }} onRefresh={async () => { await q.refetch(); }}>
      <View style={{ height: 48, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
        <Search size={18} color={colors.navy} />
        <TextInput value={term} onChangeText={setTerm} placeholder="Search services" placeholderTextColor={colors.textMuted} accessibilityLabel="Search services" style={{ flex: 1, height: 48, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text }} />
      </View>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={4} />}>
        {() => rows.length === 0 ? <EmptyState title="No matching services" body="Try a different word." /> : (
          <View style={{ gap: 12 }}>
            {rows.map(({ g, subs }) => (
              <Card key={g.id} padded={false}>
                <Pressable onPress={() => router.push(`/category/${g.id}`)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceMuted : 'transparent', borderTopLeftRadius: 16, borderTopRightRadius: 16 })}>
                  <CatIcon name={g.icon} color={colors.navy} size={22} />
                  <T v="heading" style={{ flex: 1 }}>{g.name}</T>
                  {g.providerCount != null ? <T v="caption">{g.providerCount}</T> : null}
                </Pressable>
                {subs.map((s) => (
                  <Pressable key={s.id} onPress={() => router.push({ pathname: '/explore', params: { categoryId: s.id, categoryName: s.name } })} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: 50, paddingRight: 16, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                    <T style={{ flex: 1 }} color={colors.textSubtle}>{s.name}</T>
                    {s.providerCount != null ? <T v="caption">{s.providerCount}</T> : null}
                  </Pressable>
                ))}
              </Card>
            ))}
          </View>
        )}
      </QueryBoundary>
    </Screen>
  );
}
