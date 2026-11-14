import React, { useState } from 'react';
import { Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Card, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Privacy() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    setBusy(true);
    try {
      const data = await api.users.exportMe();
      await Share.share({ title: 'My data export', message: JSON.stringify(data, null, 2) });
    } catch (e) { Alert.alert('Could not export', errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Screen title="Privacy and data" contentStyle={{ padding: 16, gap: 16 }}>
      <Card style={{ gap: 10 }}>
        <T v="heading">Download your data</T>
        <T color={colors.textMuted}>Get a copy of the personal data we hold about you.</T>
        <Button kind="secondary" title="Export my data" loading={busy} onPress={exportData} />
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="heading">Privacy policy</T>
        <T color={colors.textMuted}>Read how we collect, use and protect your information.</T>
        <Button kind="secondary" title="Read privacy policy" onPress={() => router.push('/legal/privacy')} />
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="heading" color={colors.danger}>Delete account</T>
        <T color={colors.textMuted}>Permanently removes your account and personal data.</T>
        <Button kind="danger" title="Delete my account" onPress={() => router.push('/account/delete')} />
      </Card>
    </Screen>
  );
}
