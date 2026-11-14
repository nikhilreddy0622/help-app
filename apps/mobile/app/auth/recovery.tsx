import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Card, T } from '@/components/ui';
import { colors } from '@/lib/theme';

const STEPS = [
  'Sign in with your email code or with Google instead.',
  'Open Profile, then Linked accounts.',
  'Choose Mobile number and verify your new number with a code.',
];

export default function Recovery() {
  const router = useRouter();
  return (
    <Screen title="Can't access your phone?" contentStyle={{ padding: 24, gap: 20 }}>
      <T color={colors.textMuted}>Lost or changed your number? You can still get into your account if you linked an email or Google earlier.</T>
      <Card style={{ gap: 12 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
            <T weight={700} color={colors.teal700}>{i + 1}</T>
            <T style={{ flex: 1 }}>{s}</T>
          </View>
        ))}
      </Card>
      <T v="caption">Never linked an email or Google? Contact support from the Help screen once you are signed in on another device, or create a ticket after signing in with a new method.</T>
      <Button size="lg" title="Continue with email" onPress={() => router.replace('/auth/email')} />
    </Screen>
  );
}
