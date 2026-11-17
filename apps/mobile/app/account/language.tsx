import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Group, Row, Screen } from '@/components/Screen';
import { T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const LANGS = [['en', 'English'], ['hi', 'Hindi'], ['kn', 'Kannada'], ['ta', 'Tamil'], ['te', 'Telugu'], ['mr', 'Marathi'], ['bn', 'Bengali']] as const;

export default function Language() {
  const router = useRouter();
  const { me, setMe, signedIn } = useSession();
  const pick = async (code: string) => {
    if (!signedIn) return router.back();
    try { setMe(await api.users.updateMe({ preferredLanguage: code })); router.back(); } catch (e) { Alert.alert('Could not change language', errorMessage(e)); }
  };
  return (
    <Screen title="Language" contentStyle={{ padding: 16, gap: 12 }}>
      <T color={colors.textMuted}>The app shows in your chosen language where available (English and Hindi so far, more coming). Anything not yet translated stays in English.</T>
      <Group>{LANGS.map(([c, l]) => <Row key={c} label={l} onPress={() => pick(c)} right={me?.preferredLanguage === c ? <Check size={20} color={colors.teal700} /> : <View />} />)}</Group>
    </Screen>
  );
}
