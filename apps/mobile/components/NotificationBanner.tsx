import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NotificationDto } from '@help/types';
import { colors, radius, shadowMd } from '@/lib/theme';
import { NotifLeading } from './NotifIcon';
import { T } from './ui/Text';

const HIDDEN = -220;

/** Slide-down in-app banner. Swipe up to dismiss; auto-hides after 4s (6s for important). */
export function NotificationBanner({ item, onPress, onDismissed }: { item: NotificationDto | null; onPress: (n: NotificationDto) => void; onDismissed: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(HIDDEN);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<NotificationDto | null>(null);

  const finish = useCallback((id: string) => onDismissed(id), [onDismissed]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const n = current.current;
    if (!n) return;
    y.value = withTiming(HIDDEN, { duration: 220 }, (done) => {
      if (done) runOnJS(finish)(n.id);
    });
  }, [finish, y]);

  useEffect(() => {
    if (!item) return;
    current.current = item;
    y.value = withTiming(0, { duration: 260 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    timer.current = setTimeout(hide, item.important ? 6000 : 4000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [item, hide, y]);

  const pan = Gesture.Pan()
    .onUpdate((e) => { y.value = Math.min(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) runOnJS(hide)();
      else y.value = withTiming(0, { duration: 150 });
    });

  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (!item) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingHorizontal: 12, zIndex: 100, alignItems: 'center' }, anim]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ width: '100%', maxWidth: 560 }}>
          <Pressable
            onPress={() => { hide(); onPress(item); }}
            accessibilityRole="alert"
            accessibilityLabel={`${item.title}. ${item.body}`}
            style={[{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.lg, backgroundColor: item.important ? colors.navy : colors.white, borderWidth: item.important ? 0 : 1, borderColor: colors.border }, shadowMd]}
          >
            <NotifLeading n={item} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" weight={600} numberOfLines={1} color={item.important ? colors.white : colors.navy}>{item.title}</T>
              <T v="caption" numberOfLines={2} color={item.important ? '#CBD5E1' : colors.textSubtle}>{item.body}</T>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
