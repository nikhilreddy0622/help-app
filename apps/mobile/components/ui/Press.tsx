import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>); scaleTo?: number };

/** Pressable with press feedback: a slight scale-down while pressed. Plain RN, no animation library. */
export function Press({ style, scaleTo = 0.97, ...rest }: Props) {
  return (
    <Pressable
      {...rest}
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={(state) => [typeof style === 'function' ? style(state) : style, state.pressed ? { transform: [{ scale: scaleTo }] } : null]}
    />
  );
}
