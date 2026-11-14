import React, { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { colors } from '@/lib/theme';

export function Skeleton({ w = '100%', h = 16, r = 8 }: { w?: DimensionValue; h?: number; r?: number }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: colors.border, opacity: o }} />;
}

export function CardSkeleton() {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton w={44} h={44} r={22} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton w="60%" h={16} />
          <Skeleton w="85%" h={12} />
          <Skeleton w="50%" h={12} />
        </View>
      </View>
      <Skeleton h={24} w={120} r={12} />
    </View>
  );
}
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </View>
  );
}
