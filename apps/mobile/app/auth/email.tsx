import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from '@help/validation';
import { Screen } from '@/components/Screen';
import { Button, Input, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function EmailEntry() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!z.string().email().safeParse(e).success) return setError('Enter a valid email address');
    setError(null); setBusy(true);
    try {
      const r = await api.auth.requestEmailOtp(e);
      router.push({ pathname: '/auth/otp', params: { email: e, resend: String(r.resendAfterSec ?? 30) } });
    } catch (x) { setError(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <Screen title="Sign in with email" keyboard footer={<Button size="lg" title="Send code" loading={busy} disabled={!email} onPress={submit} />} contentStyle={{ padding: 24, gap: 24 }}>
      <View style={{ gap: 8 }}>
        <T v="title">Enter your email</T>
        <T color={colors.textMuted}>We will email you a 6-digit code. No password needed.</T>
      </View>
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus error={error} returnKeyType="go" onSubmitEditing={submit} />
    </Screen>
  );
}
