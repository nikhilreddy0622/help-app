import React, { useCallback, useState } from 'react';
import { setStatusBarStyle } from 'expo-status-bar';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BookOpen, Droplets, Hammer, Mail, Phone, Scissors, Zap } from 'lucide-react-native';
import { Logo } from '@/components/Logo';
import { Button, T } from '@/components/ui';
import { colors, tilePalette } from '@/lib/theme';
import { api, errorMessage } from '@/lib/api';
import { googleIdToken } from '@/lib/google';
import { useFinishAuth } from '@/lib/useFinishAuth';

const ICONS = [Zap, Droplets, BookOpen, Scissors, Hammer];

export default function Welcome() {
  const router = useRouter();
  const finish = useFinishAuth();
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => { setStatusBarStyle('light'); return () => setStatusBarStyle('dark'); }, []));

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
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: 24, paddingTop: 16, gap: 22 }}>
        <Logo size={32} light />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ICONS.map((I, i) => {
            const t = tilePalette[i % tilePalette.length]!;
            return <View key={i} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${(i % 2 ? 1 : -1) * 4}deg` }] }}><I size={24} color={t.fg} /></View>;
          })}
        </View>
        <View style={{ gap: 8, paddingBottom: 24 }}>
          <T v="display" color="#fff" style={{ fontSize: 30, lineHeight: 36 }}>Local help you can count on</T>
          <T color="#CBEDE7" style={{ fontSize: 15 }}>Electricians, tutors, drivers and more. Real people near you, with real reviews.</T>
        </View>
      </SafeAreaView>
      <View style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <T v="title" style={{ marginBottom: 4 }}>Sign in or create an account</T>
          <Button size="lg" title="Continue with phone" icon={<Phone size={18} color="#fff" />} onPress={() => router.push('/auth/phone')} />
          <Button size="lg" kind="secondary" title="Continue with Google" loading={busy} onPress={google} />
          <Button size="lg" kind="secondary" title="Continue with email" icon={<Mail size={18} color={colors.text} />} onPress={() => router.push('/auth/email')} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Button kind="ghost" size="sm" title="Can't access your phone?" onPress={() => router.push('/auth/recovery')} />
            <Button kind="ghost" size="sm" title="Browse first" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
          <T v="caption" align="center" style={{ marginTop: 8 }}>By continuing you agree to the Terms and Privacy Policy.</T>
        </ScrollView>
      </View>
    </View>
  );
}
