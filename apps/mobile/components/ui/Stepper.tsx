import React from 'react';
import { View } from 'react-native';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Stepper({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <View style={{ gap: 8 }} accessible accessibilityLabel={`Step ${step + 1} of ${total}: ${title}`}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.teal700 : colors.border }} />
        ))}
      </View>
      <T v="caption">Step {step + 1} of {total}</T>
      <T v="title">{title}</T>
    </View>
  );
}
