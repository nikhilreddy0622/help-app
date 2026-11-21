import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadowSm } from '@/lib/theme';
import { Press } from './Press';

/** White rounded card with a soft lift. */
export function Card({ children, onPress, style, padded = true, accessibilityLabel, flat }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; padded?: boolean; accessibilityLabel?: string; flat?: boolean }) {
  const s: StyleProp<ViewStyle> = [
    { backgroundColor: colors.card, borderRadius: radius.lg, padding: padded ? 16 : 0 },
    flat ? { borderWidth: 1, borderColor: colors.border } : shadowSm,
    style,
  ];
  if (onPress) {
    return (
      // On web role=button renders <button>; cards contain their own buttons, and nested buttons are invalid HTML.
      <Press accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'} accessibilityLabel={accessibilityLabel} onPress={onPress} scaleTo={0.98} style={s}>
        {children}
      </Press>
    );
  }
  return <View style={s}>{children}</View>;
}
