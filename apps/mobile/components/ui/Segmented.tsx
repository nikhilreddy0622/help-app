import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Segmented<K extends string | number>({ options, value, onChange, compact }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: compact ? 10 : 12, borderWidth: 1, borderColor: colors.border, padding: compact ? 3 : 4, gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: compact ? 32 : 44, borderRadius: compact ? 8 : 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.white : 'transparent', paddingHorizontal: 8, ...(on ? { shadowColor: '#0B1220', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null) }}
          >
            <T v="label" weight={on ? 700 : 600} color={on ? colors.text : colors.textMuted} numberOfLines={1} style={{ fontSize: compact ? 13 : 14 }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
