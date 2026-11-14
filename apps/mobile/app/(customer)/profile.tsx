import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BriefcaseBusiness, ChevronRight, FileText, Languages, Link2, LifeBuoy, LogOut, Monitor, PencilLine, ShieldCheck } from 'lucide-react-native';
import { Group, Row } from '@/components/Screen';
import { Avatar, Button, Card, EmptyState, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const chev = <ChevronRight size={18} color={colors.textMuted} />;
const ic = (I: typeof Bell) => <I size={20} color={colors.navy} />;

export function AccountRows() {
  const router = useRouter();
  return (
    <>
      <Group>
        <Row icon={ic(PencilLine)} label="Edit profile" right={chev} onPress={() => router.push('/account/edit')} />
        <Row icon={ic(Languages)} label="Language" right={chev} onPress={() => router.push('/account/language')} />
        <Row icon={ic(Link2)} label="Linked accounts" right={chev} onPress={() => router.push('/account/linked')} />
        <Row icon={ic(Monitor)} label="Devices and sessions" right={chev} onPress={() => router.push('/account/sessions')} />
        <Row icon={ic(Bell)} label="Notifications" right={chev} onPress={() => router.push('/notifications/settings')} />
      </Group>
      <Group>
        <Row icon={ic(ShieldCheck)} label="Privacy and data" right={chev} onPress={() => router.push('/account/privacy')} />
        <Row icon={ic(LifeBuoy)} label="Help and safety" right={chev} onPress={() => router.push('/account/help')} />
        <Row icon={ic(FileText)} label="Legal" right={chev} onPress={() => router.push('/account/legal')} />
      </Group>
    </>
  );
}

export default function Profile() {
  const router = useRouter();
  const { me, signedIn, mode, switchMode, signOut } = useSession();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {!signedIn ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState title="Sign in to help" body="Save professionals, chat with them and write reviews." actionLabel="Sign in or create account" onAction={() => router.push('/auth/welcome')} />
          <View style={{ paddingHorizontal: 24 }}><Group><Row icon={ic(LifeBuoy)} label="Help and safety" right={chev} onPress={() => router.push('/account/help')} /><Row icon={ic(FileText)} label="Legal" right={chev} onPress={() => router.push('/account/legal')} /></Group></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <T v="title">Profile</T>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar name={me?.name} url={me?.avatarUrl} size={56} />
            <View style={{ flex: 1 }}>
              <T v="heading" numberOfLines={1}>{me?.name ?? 'Add your name'}</T>
              <T v="caption" numberOfLines={1}>{me?.phone ?? me?.email}</T>
            </View>
          </Card>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <BriefcaseBusiness size={22} color={colors.teal} />
              <View style={{ flex: 1 }}>
                <T v="heading" color={colors.text}>{me?.hasProviderProfile ? 'Your professional profile' : 'Offer your services'}</T>
                <T v="caption">{me?.hasProviderProfile ? 'Manage your status, chats and plan.' : 'Create a profile and get found by customers nearby.'}</T>
              </View>
            </View>
            {me?.hasProviderProfile
              ? <Button title={mode === 'customer' ? 'Switch to provider mode' : 'Switch to customer mode'} onPress={() => switchMode(mode === 'customer' ? 'provider' : 'customer')} />
              : <Button title="Become a professional" onPress={() => router.push('/onboarding')} />}
          </Card>
          <AccountRows />
          <Button kind="secondary" title="Sign out" icon={<LogOut size={18} color={colors.navy} />} onPress={signOut} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
