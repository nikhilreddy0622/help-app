import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { View } from 'react-native';
import * as Device from 'expo-device';
import { useLocalSearchParams } from 'expo-router';
import { OtpBoxes } from '@/components/OtpBoxes';
import { Screen } from '@/components/Screen';
import { Button, T } from '@/components/ui';
import { colors } from '@/lib/theme';
import { api, errorMessage } from '@/lib/api';
import { useFinishAuth } from '@/lib/useFinishAuth';

/** Code entry for both phone (?phone=) and email (?email=) sign-in. */
export default function Otp() {
  const { phone, email, resend } = useLocalSearchParams<{ phone?: string; email?: string; resend?: string }>();
  const finish = useFinishAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(Number(resend ?? 30));
  const target = email ?? phone ?? '';

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async (c: string) => {
    setBusy(true); setError(null);
    const base = { code: c, platform: (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android', deviceName: Device.modelName ?? undefined };
    try {
      const r = email ? await api.auth.verifyEmailOtp({ email, ...base }) : await api.auth.verifyOtp({ phone: phone ?? '', ...base });
      await finish(r.tokens, r.me);
    } catch (e) { setError(errorMessage(e)); setCode(''); } finally { setBusy(false); }
  };

  const onChange = (c: string) => { setCode(c); if (c.length === 6) verify(c); };
  const resendCode = async () => {
    try {
      const r = email ? await api.auth.requestEmailOtp(email) : await api.auth.requestOtp(phone ?? '');
      setLeft(r.resendAfterSec ?? 30); setError(null);
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <Screen title="Verify" keyboard contentStyle={{ padding: 24, gap: 24 }}
      footer={<Button size="lg" title="Verify" loading={busy} disabled={code.length !== 6} onPress={() => verify(code)} />}>
      <View style={{ gap: 8 }}>
        <T v="title">Enter the 6-digit code</T>
        <T color={colors.textMuted}>Sent to {target}</T>
      </View>
      <OtpBoxes value={code} onChange={onChange} error={!!error} autoFocus />
      {error ? <T v="caption" color={colors.danger}>{error}</T> : null}
      {left > 0 ? <T v="caption">Resend code in {left}s</T> : <Button kind="ghost" size="sm" title="Resend code" onPress={resendCode} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
    </Screen>
  );
}
