import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LOADER, MARK_PARTS } from '@help/ui-tokens';
import { colors } from '@/lib/theme';
import { T } from './ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Mark({ size = 32, dotOpacity }: { size?: number; dotOpacity?: Animated.Value }) {
  const m = MARK_PARTS;
  return (
    <Svg width={size} height={size} viewBox={m.viewBox} accessibilityLabel="help">
      <Rect width={512} height={512} rx={m.bg.rx} fill={m.bg.fill} />
      <Path d={m.h.d} stroke={m.h.stroke} strokeWidth={m.h.strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {dotOpacity ? <AnimatedCircle cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} fill={m.dot.fill} opacity={dotOpacity} /> : <Circle cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} fill={m.dot.fill} />}
    </Svg>
  );
}

/** Mark plus the "help." wordmark (Inter Bold navy, teal dot). */
export function Logo({ size = 28, mark = true }: { size?: number; mark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }} accessible accessibilityRole="image" accessibilityLabel="help">
      {mark ? <Mark size={size} /> : null}
      <T weight={700} color={colors.navy} style={{ fontSize: size * 0.95, lineHeight: size * 1.2, letterSpacing: -0.5 }}>
        help<T weight={700} color={colors.teal} style={{ fontSize: size * 0.95, lineHeight: size * 1.2 }}>.</T>
      </T>
    </View>
  );
}

/** Full-screen loader: only the teal dot of the mark fades. */
export function BrandLoader({ full = true }: { full?: boolean }) {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const half = LOADER.durationMs / 2;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: LOADER.dotMinOpacity, duration: half, useNativeDriver: false }),
      Animated.timing(o, { toValue: 1, duration: half, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }, full ? { flex: 1 } : { padding: 40 }]} accessible accessibilityLabel="Loading">
      <Mark size={72} dotOpacity={o} />
    </View>
  );
}
