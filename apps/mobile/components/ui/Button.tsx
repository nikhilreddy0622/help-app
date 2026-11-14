import React from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { T } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';
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
export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, size = 'md', style, accessibilityLabel }: Props) {
  const h = size === 'lg' ? 52 : size === 'sm' ? 44 : 48;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.teal700 : colors.navy;
  const bg = kind === 'primary' ? colors.teal700 : colors.white;
  const border = kind === 'secondary' ? colors.borderStrong : kind === 'danger' ? '#FCA5A5' : 'transparent';
  const off = disabled || loading;
  const pressedBg = kind === 'primary' ? colors.teal800 : colors.surfaceMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: h, borderRadius: radius.md, backgroundColor: pressed ? pressedBg : kind === 'ghost' ? 'transparent' : bg,
          borderWidth: kind === 'secondary' || kind === 'danger' ? 1 : 0, borderColor: border,
          paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          opacity: off ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <T v="label" weight={600} color={fg} style={{ fontSize: size === 'lg' ? 16 : 15 }}>{title}</T>
        </>
      )}
    </Pressable>
  );
}
