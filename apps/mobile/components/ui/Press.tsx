import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { motion } from '@help/ui-tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>); scaleTo?: number };

/** Pressable with press feedback: a quick scale-down on press-in (CSS transition on the UI thread). */
export function Press({ style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const [down, setDown] = useState(false);
  const reduced = useReducedMotion();
  const resolved = typeof style === 'function' ? style({ pressed: down }) : style;
  return (
    <AnimatedPressable
      {...rest}
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPressIn={(e) => { setDown(true); onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); onPressOut?.(e); }}
      style={[
        resolved,
        {
          transform: [{ scale: down && !reduced ? scaleTo : 1 }],
          transitionProperty: 'transform',
          transitionDuration: motion.press,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      ]}
    />
  );
}
