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
      {label ? <T v="label" color={colors.textSubtle}>{label}</T> : null}
      <View
        style={{
          flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', borderWidth: 1.5,
          borderColor: error ? colors.danger : focus ? colors.brand : 'transparent', borderRadius: radius.md,
          backgroundColor: focus ? colors.white : colors.surfaceMuted, paddingHorizontal: 14, gap: 8,
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
          style={[{ flex: 1, minHeight: multiline ? 104 : 50, paddingVertical: multiline ? 14 : 0, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.text, textAlignVertical: multiline ? 'top' : 'center' }, style]}
        />
      </View>
      {error ? <T v="caption" color={colors.danger}>{error}</T> : hint ? <T v="caption">{hint}</T> : null}
    </View>
  );
});
