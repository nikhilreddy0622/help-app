import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/lib/theme';
import { useCompare } from '@/lib/compare';
import { Button } from './ui/Button';
import { T } from './ui/Text';

/** Sticky bar shown on list screens once at least one professional is selected. */
export function CompareBar() {
  const { items, clear } = useCompare();
  const router = useRouter();
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
      <T v="label" style={{ flex: 1 }}>{items.length} selected {items.length < 2 ? '(pick one more)' : ''}</T>
      <Button kind="ghost" size="sm" title="Clear" onPress={clear} />
      <Button size="sm" title="Compare" disabled={items.length < 2} onPress={() => router.push('/compare')} />
    </View>
  );
}
