import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/lib/theme';
import { useCategories } from '@/lib/hooks';
import { CatIcon } from './CategoryIcon';
import { Skeleton, T } from './ui';

function Tile({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <View style={{ width: '33.333%', padding: 5 }}>
      <Pressable
        onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
        style={({ pressed }) => ({ minHeight: 100, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.white, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 14 })}
      >
        {icon}
        <T v="micro" weight={500} align="center" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{label}</T>
      </Pressable>
    </View>
  );
}

/** 3-column grid of category groups plus an "All services" tile. */
export function GroupGrid() {
  const router = useRouter();
  const q = useCategories();
  if (q.isPending) {
    return <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -5 }}>{Array.from({ length: 12 }).map((_, i) => <View key={i} style={{ width: '33.333%', padding: 5 }}><Skeleton h={100} r={16} /></View>)}</View>;
  }
  const groups = (q.data ?? []).filter((c) => !c.parentId);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -5 }}>
      {groups.slice(0, 11).map((g) => (
        <Tile key={g.id} label={g.name} icon={<CatIcon name={g.icon} color={colors.navy} />} onPress={() => router.push(`/category/${g.id}`)} />
      ))}
      <Tile label="All services" icon={<CatIcon name="dots" color={colors.teal} />} onPress={() => router.push('/services')} />
    </View>
  );
}
