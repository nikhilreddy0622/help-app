import React from 'react';
import { Pressable } from 'react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Chip({ label, selected, onPress, icon, count }: { label: string; selected?: boolean; onPress?: () => void; icon?: React.ReactNode; count?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{
        height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        borderColor: selected ? colors.teal700 : colors.border, backgroundColor: selected ? colors.tealTint : colors.white,
      }}
    >
      {icon}
      <T v="label" color={selected ? colors.teal800 : colors.text}>{label}</T>
      {count ? <T v="micro" color={selected ? colors.teal800 : colors.textMuted}>{count > 99 ? '99+' : count}</T> : null}
    </Pressable>
  );
}
