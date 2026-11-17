import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, CalendarClock, MessageCircle, TrendingUp, Wallet } from 'lucide-react-native';
import { Button, Card, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const BENEFITS = [
  { icon: TrendingUp, title: 'Get discovered', body: 'Show up when people nearby search for what you do.' },
  { icon: MessageCircle, title: 'Chats, not cold calls', body: 'Customers reach you in the app; share your number when you like.' },
  { icon: CalendarClock, title: 'You set the pace', body: 'Mark yourself available, busy or away — change it anytime.' },
  { icon: Wallet, title: 'Keep what you earn', body: 'No commission on your work. One simple membership, that’s it.' },
] as const;

export default function Register() {
  const router = useRouter();
  const { me, switchMode } = useSession();
  const isPro = !!me?.hasProviderProfile;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={{ gap: 6, paddingTop: 8 }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.tealTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <BadgeCheck size={14} color={colors.teal700} />
            <T v="caption" color={colors.teal800} weight={600}>For professionals</T>
          </View>
          <T v="display">Grow your work on help</T>
          <T color={colors.textMuted}>Join the local pros customers already trust. Setting up takes a few minutes, and it’s free to list.</T>
        </View>

        <View style={{ gap: 10 }}>
          {BENEFITS.map((b) => (
            <Card key={b.title}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}><b.icon size={20} color={colors.teal700} /></View>
                <View style={{ flex: 1, gap: 2 }}><T weight={600}>{b.title}</T><T v="caption" color={colors.textMuted}>{b.body}</T></View>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: 8 }}>
          {isPro ? (
            <Button title="Go to your professional area" onPress={() => void switchMode('provider')} />
          ) : (
            <Button title="Register as a professional" onPress={() => router.push('/onboarding')} />
          )}
          <T v="caption" color={colors.textMuted} align="center">Takes about 5 minutes · free to list · you’re in control</T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
