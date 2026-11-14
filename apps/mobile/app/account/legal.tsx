import React from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Group, Row, Screen } from '@/components/Screen';
import { LEGAL } from '@/lib/legal';
import { colors } from '@/lib/theme';

export default function Legal() {
  const router = useRouter();
  return (
    <Screen title="Legal" contentStyle={{ padding: 16 }}>
      <Group>{Object.entries(LEGAL).map(([k, d]) => <Row key={k} label={d.title} onPress={() => router.push(`/legal/${k}`)} right={<ChevronRight size={18} color={colors.textMuted} />} />)}</Group>
    </Screen>
  );
}
