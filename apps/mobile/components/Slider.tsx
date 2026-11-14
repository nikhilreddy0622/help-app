import React, { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { colors } from '@/lib/theme';

/** Minimal accessible slider (no native dependency). */
export function Slider({ value, min, max, step = 1, onChange, label }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string }) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const cb = useRef(onChange);
  cb.current = onChange;
  const set = (x: number) => {
    if (!wRef.current) return;
    const ratio = Math.min(1, Math.max(0, x / wRef.current));
    const v = Math.round((min + ratio * (max - min)) / step) * step;
    cb.current(Math.min(max, Math.max(min, v)));
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => set(e.nativeEvent.locationX), onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    onPanResponderTerminationRequest: () => false,
  })).current;
  const onLayout = (e: LayoutChangeEvent) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); };
  const pos = w * ((value - min) / (max - min));
  return (
    <View
      onLayout={onLayout} {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => cb.current(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      style={{ height: 44, justifyContent: 'center' }}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
        <View style={{ width: pos, height: 4, borderRadius: 2, backgroundColor: colors.teal700 }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, pos - 12), width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.teal700 }} />
    </View>
  );
}
