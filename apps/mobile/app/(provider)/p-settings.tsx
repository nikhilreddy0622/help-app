import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Phone, Zap, Bell, ChevronRight, FileText, LifeBuoy, Link2, LogOut, Monitor, Receipt, RefreshCw, ShieldCheck, PencilLine } from 'lucide-react-native';
import { Group, Row } from '@/components/Screen';
import { Button, T } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const chev = <ChevronRight size={18} color={colors.textMuted} />;
const ic = (I: typeof Bell) => <I size={20} color={colors.navy} />;

export default function ProviderSettings() {
  const router = useRouter();
  const { switchMode, signOut } = useSession();
  const sub = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine() });
  const s = sub.data;
  const planValue = !s ? 'No plan' : `${s.plan.name}${s.currentPeriodEnd ? ` · ${s.cancelAtPeriodEnd ? 'ends' : 'renews'} ${formatDate(s.currentPeriodEnd)}` : ''}`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <T v="title">Settings</T>
        <Group>
          <Row icon={ic(RefreshCw)} label="Subscription and plan" value={planValue} right={chev} onPress={() => router.push('/subscription')} />
          <Row icon={ic(Receipt)} label="Payment history" right={chev} onPress={() => router.push('/payments')} />
          <Row icon={ic(Phone)} label="Contact settings" right={chev} onPress={() => router.push('/contact-settings')} />
          <Row icon={ic(Zap)} label="Quick replies" right={chev} onPress={() => router.push('/quick-replies')} />
          <Row icon={ic(Bell)} label="Notifications" right={chev} onPress={() => router.push('/notifications/settings')} />
        </Group>
        <Group>
          <Row icon={ic(PencilLine)} label="Account details" right={chev} onPress={() => router.push('/account/edit')} />
          <Row icon={ic(Link2)} label="Linked accounts" right={chev} onPress={() => router.push('/account/linked')} />
          <Row icon={ic(Monitor)} label="Devices and sessions" right={chev} onPress={() => router.push('/account/sessions')} />
          <Row icon={ic(ShieldCheck)} label="Privacy and data" right={chev} onPress={() => router.push('/account/privacy')} />
          <Row icon={ic(LifeBuoy)} label="Help and safety" right={chev} onPress={() => router.push('/account/help')} />
          <Row icon={ic(FileText)} label="Legal" right={chev} onPress={() => router.push('/account/legal')} />
        </Group>
        <Button title="Switch to customer mode" onPress={() => switchMode('customer')} />
        <Button kind="secondary" title="Sign out" icon={<LogOut size={18} color={colors.navy} />} onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}
