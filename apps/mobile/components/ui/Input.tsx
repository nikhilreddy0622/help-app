import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { T } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  left?: React.ReactNode;
}
export const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, Props>(function Input({ label, error, hint, left, multiline, style, ...rest }, ref) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="label" weight={600}>{label}</T> : null}
      <View
        style={{
          flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', borderWidth: focus ? 2 : 1,
          borderColor: error ? colors.danger : focus ? colors.teal700 : colors.borderStrong, borderRadius: radius.md,
          backgroundColor: colors.white, paddingHorizontal: focus ? 11 : 12, gap: 8,
        }}
      >
        {left}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          style={[{ flex: 1, minHeight: multiline ? 96 : 48, paddingVertical: multiline ? 12 : 0, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text, textAlignVertical: multiline ? 'top' : 'center' }, style]}
        />
      </View>
      {error ? <T v="caption" color={colors.danger}>{error}</T> : hint ? <T v="caption">{hint}</T> : null}
    </View>
  );
});
