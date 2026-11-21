import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { Press } from './Press';
import { T } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'accent' | 'soft';
interface Props {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const KIND: Record<Kind, { fg: string; bg: string; pressed: string; border: string }> = {
  primary: { fg: '#fff', bg: colors.brand, pressed: colors.brandDeep, border: 'transparent' },
  dark: { fg: '#fff', bg: colors.navy, pressed: '#0A1528', border: 'transparent' },
  accent: { fg: colors.accentInk, bg: colors.accent, pressed: '#F0B200', border: 'transparent' },
  soft: { fg: colors.teal800, bg: colors.tealTint, pressed: colors.tealSoft, border: 'transparent' },
  secondary: { fg: colors.text, bg: colors.white, pressed: colors.surfaceMuted, border: colors.border },
  ghost: { fg: colors.brand, bg: 'transparent', pressed: colors.tealTint, border: 'transparent' },
  danger: { fg: colors.danger, bg: colors.white, pressed: colors.dangerBg, border: '#F5C2BF' },
};

export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, size = 'md', style, accessibilityLabel }: Props) {
  const h = size === 'lg' ? 54 : size === 'sm' ? 40 : 48;
  const k = KIND[kind];
  const off = disabled || loading;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        {
          minHeight: h, borderRadius: size === 'sm' ? 12 : radius.md, backgroundColor: pressed && !off ? k.pressed : k.bg,
          borderWidth: k.border === 'transparent' ? 0 : 1.5, borderColor: k.border,
          paddingHorizontal: size === 'sm' ? 14 : 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          opacity: off && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <T weight={700} color={k.fg} numberOfLines={1} style={{ fontSize: size === 'lg' ? 16 : size === 'sm' ? 14 : 15 }}>{title}</T>
        </>
      )}
    </Press>
  );
}
