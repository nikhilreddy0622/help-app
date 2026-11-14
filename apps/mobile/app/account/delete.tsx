import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, Input, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const CONSEQUENCES = [
  'Your profile, saved professionals and notification settings are permanently deleted.',
  'If you are a professional, your public profile is removed and customers can no longer find you.',
  'Your messages are deleted. Reviews you wrote may stay without your name.',
  'Payment records may be kept where the law requires. Active renewals stop.',
  'You cannot undo this. You can create a new account later, but nothing is restored.',
];

export default function DeleteAccount() {
  const { signOut, me } = useSession();
  const sub = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine(), enabled: !!me?.hasProviderProfile });
  const [ok, setOk] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true);
    try { await api.users.deleteMe(); await signOut(); } catch (e) { Alert.alert('Could not delete', errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Screen title="Delete account" keyboard contentStyle={{ padding: 16, gap: 16 }}
      footer={<Button kind="danger" size="lg" title="Delete my account forever" loading={busy} disabled={!ok || word !== 'DELETE'} onPress={del} />}>
      <T v="title" color={colors.danger}>Before you go</T>
      <Card style={{ gap: 10 }}>{CONSEQUENCES.map((c) => <T key={c} color={colors.textSubtle}>{'•'} {c}</T>)}</Card>
      {sub.data && sub.data.status === 'ACTIVE' ? <View style={{ backgroundColor: colors.warningBg, borderRadius: 12, padding: 12 }}><T v="caption" color={colors.warningFg}>You have an active subscription. Cancel renewal first in Settings so you are not charged again.</T></View> : null}
      <Pressable onPress={() => setOk(!ok)} accessibilityRole="checkbox" accessibilityState={{ checked: ok }} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ok ? colors.teal700 : colors.borderStrong, backgroundColor: ok ? colors.teal700 : colors.white, alignItems: 'center', justifyContent: 'center' }}>{ok ? <Check size={16} color="#fff" /> : null}</View>
        <T style={{ flex: 1 }}>I understand this is permanent.</T>
      </Pressable>
      <Input label="Type DELETE to confirm" value={word} onChangeText={setWord} autoCapitalize="characters" />
    </Screen>
  );
}
