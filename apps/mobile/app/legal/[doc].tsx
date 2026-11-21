import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EmptyState, T } from '@/components/ui';
import { LEGAL } from '@/lib/legal';
import { colors } from '@/lib/theme';

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = LEGAL[doc ?? ''];
  if (!d) return <Screen title="Legal"><EmptyState title="Page not found" /></Screen>;
  return (
    <Screen title={d.title} contentStyle={{ padding: 20, gap: 20 }}>
      <View style={{ gap: 6 }}>
        <T color={colors.textSubtle}>{d.intro}</T>
        <T v="caption">Last updated {d.updated}</T>
      </View>
      {d.sections.map((s) => (
        <View key={s.h} style={{ gap: 6 }}><T v="heading">{s.h}</T><T color={colors.textSubtle}>{s.p}</T></View>
      ))}
    </Screen>
  );
}
