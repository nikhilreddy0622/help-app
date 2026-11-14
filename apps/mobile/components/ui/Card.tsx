import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadowSm } from '@/lib/theme';

export function Card({ children, onPress, style, padded = true, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; padded?: boolean; accessibilityLabel?: string }) {
  const s: StyleProp<ViewStyle> = [
    { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: padded ? 16 : 0 },
    shadowSm,
    style,
  ];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [s, pressed && { backgroundColor: colors.surfaceMuted }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={s}>{children}</View>;
}
