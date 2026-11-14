import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { Platform } from 'react-native';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button, T } from '@/components/ui';
import { colors } from '@/lib/theme';
import { api, errorMessage } from '@/lib/api';
import { googleIdToken } from '@/lib/google';
import { useFinishAuth } from '@/lib/useFinishAuth';

export default function Welcome() {
  const router = useRouter();
  const finish = useFinishAuth();
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    try {
      const idToken = await googleIdToken();
      const r = await api.auth.google({ idToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
      await finish(r.tokens, r.me);
    } catch (e) {
      Alert.alert('Google sign-in', errorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Screen noHeader scroll contentStyle={{ padding: 24, justifyContent: 'space-between', gap: 32 }}>
      <View style={{ paddingTop: 48, gap: 16 }}>
        <Logo size={40} />
        <T v="display">Trusted professionals, right around you</T>
        <T v="body" color={colors.textMuted}>Find verified electricians, tutors, drivers and more nearby. Sign in to chat, save and review.</T>
      </View>
      <View style={{ gap: 12 }}>
        <Button size="lg" title="Continue with phone" icon={<Phone size={18} color="#fff" />} onPress={() => router.push('/auth/phone')} />
        <Button size="lg" kind="secondary" title="Continue with email" onPress={() => router.push('/auth/email')} />
        <Button size="lg" kind="secondary" title="Continue with Google" loading={busy} onPress={google} />
        <Button kind="ghost" size="sm" title="Can't access your phone?" onPress={() => router.push('/auth/recovery')} />
        <Button kind="ghost" title="Browse without signing in" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <T v="caption" align="center">By continuing you agree to the Terms and Privacy Policy.</T>
      </View>
    </Screen>
  );
}
