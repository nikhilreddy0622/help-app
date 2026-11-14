import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { indianPhone } from '@help/validation';
import { Screen } from '@/components/Screen';
import { Button, Input, T } from '@/components/ui';
import { colors } from '@/lib/theme';
import { api, errorMessage } from '@/lib/api';

export default function PhoneEntry() {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const phone = `+91${digits}`;
    const parsed = indianPhone.safeParse(phone);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Enter a valid mobile number'); return; }
    setError(null); setBusy(true);
    try {
      const r = await api.auth.requestOtp(phone);
      router.push({ pathname: '/auth/otp', params: { phone, resend: String(r.resendAfterSec ?? 30) } });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Screen title="Sign in" keyboard footer={<Button size="lg" title="Send code" loading={busy} disabled={digits.length !== 10} onPress={submit} />} contentStyle={{ padding: 24, gap: 24 }}>
      <View style={{ gap: 8 }}>
        <T v="title">Enter your mobile number</T>
        <T color={colors.textMuted}>We will text you a 6-digit code. Standard SMS rates may apply.</T>
      </View>
      <Input
        label="Mobile number" keyboardType="number-pad" maxLength={10} value={digits} autoFocus
        onChangeText={(t) => setDigits(t.replace(/\D/g, ''))} placeholder="98765 43210" error={error}
        left={<T v="label" weight={600}>+91</T>} onSubmitEditing={submit} returnKeyType="go" textContentType="telephoneNumber"
      />
    </Screen>
  );
}
