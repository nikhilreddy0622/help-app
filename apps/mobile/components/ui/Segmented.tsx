import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Segmented<K extends string | number>({ options, value, onChange, compact }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.border, borderRadius: compact ? 10 : 12, padding: compact ? 3 : 4, gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: compact ? 32 : 44, borderRadius: compact ? 8 : 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.white : 'transparent', paddingHorizontal: 8 }}
          >
            <T v="label" weight={on ? 600 : 500} color={on ? colors.navy : colors.textSubtle} numberOfLines={1} style={{ fontSize: compact ? 13 : 14 }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
