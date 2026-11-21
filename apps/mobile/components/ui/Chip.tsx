import React from 'react';
import { colors } from '@/lib/theme';
import { Press } from './Press';
import { T } from './Text';

export function Chip({ label, selected, onPress, icon, count }: { label: string; selected?: boolean; onPress?: () => void; icon?: React.ReactNode; count?: number }) {
  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={4}
      style={{
        height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6,
        borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.tealTint : colors.white,
      }}
    >
      {icon}
      <T v="label" color={selected ? colors.teal800 : colors.text}>{label}</T>
      {count ? <T v="micro" color={selected ? colors.teal800 : colors.textMuted}>{count > 99 ? '99+' : count}</T> : null}
    </Press>
  );
}
