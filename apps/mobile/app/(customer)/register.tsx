import React, { useCallback } from 'react';
import { setStatusBarStyle } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarClock, MessageCircle, TrendingUp, Wallet } from 'lucide-react-native';
import { Button, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors, shadowSm, tilePalette } from '@/lib/theme';

const BENEFITS = [
  { icon: TrendingUp, title: 'Get discovered', body: 'Show up when people nearby search for what you do.' },
  { icon: MessageCircle, title: 'Chats, not cold calls', body: 'Customers message you in the app. Share your number only if you want.' },
  { icon: CalendarClock, title: 'You set the pace', body: 'Mark yourself available, busy or away, and change it anytime.' },
  { icon: Wallet, title: 'Keep what you earn', body: 'No commission on your work. One simple membership.' },
] as const;
const STEPS = ['You', 'Location', 'Prices', 'Go live'];

export default function Register() {
  const router = useRouter();
  const { me, switchMode } = useSession();
  const isPro = !!me?.hasProviderProfile;
  useFocusEffect(useCallback(() => { setStatusBarStyle('light'); return () => setStatusBarStyle('dark'); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ backgroundColor: colors.navy, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <SafeAreaView edges={['top']} style={{ padding: 22, paddingTop: 18, gap: 10 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' }}>
              <T v="micro" weight={800} color={colors.accentInk}>FOR PROFESSIONALS</T>
            </View>
            <T v="display" color="#fff" style={{ fontSize: 30, lineHeight: 36 }}>Grow your work on help</T>
            <T color="#C9D3E6">Join the local pros customers already trust. Free to list, live in 4 short steps.</T>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {STEPS.map((s, i) => (
                <View key={s} style={{ flex: 1, gap: 6 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: i === 0 ? colors.accent : 'rgba(255,255,255,0.25)' }} />
                  <T v="micro" color="#C9D3E6" numberOfLines={1}>{s}</T>
                </View>
              ))}
            </View>
          </SafeAreaView>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {BENEFITS.map((b, i) => {
            const t = tilePalette[i % tilePalette.length]!;
            return (
              <View key={b.title} style={[{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, padding: 16 }, shadowSm]}>
                <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><b.icon size={24} color={t.fg} /></View>
                <View style={{ flex: 1, gap: 2 }}><T v="heading">{b.title}</T><T v="caption">{b.body}</T></View>
              </View>
            );
          })}
          <View style={{ gap: 8, marginTop: 8 }}>
            {isPro ? (
              <Button size="lg" title="Go to your professional area" onPress={() => void switchMode('provider')} />
            ) : (
              <Button size="lg" title="Register as a professional" onPress={() => router.push('/onboarding')} />
            )}
            <T v="caption" align="center">About 5 minutes · free to list · you are in control</T>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
