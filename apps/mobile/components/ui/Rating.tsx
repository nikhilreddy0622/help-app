import React from 'react';
import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

const STAR = '#F5A623';

/** Green rating badge (food-app style). "New" when there are no reviews yet. */
export function Rating({ avg, count, showCount = true }: { avg: number | null; count: number; showCount?: boolean }) {
  if (avg == null || count === 0) {
    return <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.accentSoft, justifyContent: 'center' }}><T v="micro" color={colors.accentInk}>New</T></View>;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel={`Rated ${avg.toFixed(1)} from ${count} reviews`}>
      <View style={{ height: 22, paddingHorizontal: 6, borderRadius: 6, backgroundColor: colors.rating, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <T v="micro" color="#fff" weight={700}>{avg.toFixed(1)}</T>
        <Star size={11} color="#fff" fill="#fff" />
      </View>
      {showCount ? <T v="caption">({count})</T> : null}
    </View>
  );
}

export function StarInput({ value, onChange, size = 34, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${label}, ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} style={{ width: Math.max(size + 12, 34), height: Math.max(size + 12, 40), alignItems: 'center', justifyContent: 'center' }}>
          <Star size={size} color={n <= value ? STAR : colors.borderStrong} fill={n <= value ? STAR : 'transparent'} />
        </Pressable>
      ))}
    </View>
  );
}
