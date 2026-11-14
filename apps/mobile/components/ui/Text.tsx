import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, font } from '@/lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'micro' | 'overline';
const family = { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold' } as const;

const base: Record<Variant, TextStyle> = {
  display: { fontFamily: family[700], fontSize: font.display.size, lineHeight: font.display.lineHeight, letterSpacing: font.display.letterSpacing, color: colors.navy },
  title: { fontFamily: family[600], fontSize: font.title.size, lineHeight: font.title.lineHeight, color: colors.navy },
  heading: { fontFamily: family[600], fontSize: font.heading.size, lineHeight: font.heading.lineHeight, color: colors.navy },
  body: { fontFamily: family[400], fontSize: font.body.size, lineHeight: font.body.lineHeight, color: colors.text },
  label: { fontFamily: family[500], fontSize: font.label.size, lineHeight: font.label.lineHeight, color: colors.text },
  caption: { fontFamily: family[400], fontSize: font.caption.size, lineHeight: font.caption.lineHeight, color: colors.textMuted },
  micro: { fontFamily: family[600], fontSize: font.micro.size, lineHeight: font.micro.lineHeight, color: colors.text },
  overline: { fontFamily: family[600], fontSize: 12, lineHeight: 16, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.textMuted },
};

export interface TProps extends TextProps {
  v?: Variant;
  color?: string;
  weight?: 400 | 500 | 600 | 700;
  align?: TextStyle['textAlign'];
}
export function T({ v = 'body', color, weight, align, style, ...rest }: TProps) {
  return (
    <RNText
      {...rest}
      style={[base[v], color ? { color } : null, weight ? { fontFamily: family[weight] } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
