import React from 'react';
import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Rating({ avg, count, showCount = true }: { avg: number | null; count: number; showCount?: boolean }) {
  if (avg == null || count === 0) return <T v="micro" color={colors.navy}>New</T>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessible accessibilityLabel={`Rated ${avg.toFixed(1)} from ${count} reviews`}>
      <Star size={14} color={colors.warning} fill={colors.warning} />
      <T v="label" weight={700}>{avg.toFixed(1)}</T>
      {showCount ? <T v="caption">({count})</T> : null}
    </View>
  );
}

export function StarInput({ value, onChange, size = 32, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${label}, ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Star size={size} color={n <= value ? colors.warning : colors.borderStrong} fill={n <= value ? colors.warning : 'transparent'} />
        </Pressable>
      ))}
    </View>
  );
}
