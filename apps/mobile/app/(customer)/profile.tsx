import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BriefcaseBusiness, ChevronRight, FileText, Heart, Link2, LifeBuoy, LogOut, MessageCircle, Monitor, PencilLine, ShieldCheck } from 'lucide-react-native';
import { Group, Row, TabHeader } from '@/components/Screen';
import { Avatar, Button, Card, EmptyState, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const chev = <ChevronRight size={18} color={colors.textMuted} />;
const ic = (I: typeof Bell) => <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}><I size={18} color={colors.text} /></View>;

export function AccountRows() {
  const router = useRouter();
  return (
    <>
      <Group>
        <Row icon={ic(PencilLine)} label="Edit profile" right={chev} onPress={() => router.push('/account/edit')} />
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
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <TabHeader title="Profile" />
          <View style={{ backgroundColor: colors.brand, borderRadius: 24, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar name={me?.name} url={me?.avatarUrl} size={60} />
            <View style={{ flex: 1 }}>
              <T v="title" color="#fff" numberOfLines={1}>{me?.name ?? 'Add your name'}</T>
              <T color="#CBEDE7" numberOfLines={1} style={{ fontSize: 14 }}>{me?.phone ?? me?.email}</T>
            </View>
            <Button kind="accent" size="sm" title="Edit" onPress={() => router.push('/account/edit')} />
          </View>
          <Card style={{ gap: 12, backgroundColor: colors.accentSoft }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><BriefcaseBusiness size={22} color={colors.accentInk} /></View>
              <View style={{ flex: 1 }}>
                <T v="heading" color={colors.accentInk}>{me?.hasProviderProfile ? 'Your professional profile' : 'Offer your services'}</T>
                <T v="caption" color="#7A5A14">{me?.hasProviderProfile ? 'Manage your status, chats and plan.' : 'Create a profile and get found by customers nearby.'}</T>
              </View>
            </View>
            {me?.hasProviderProfile
              ? <Button kind="dark" title={mode === 'customer' ? 'Switch to professional mode' : 'Switch to customer mode'} onPress={() => switchMode(mode === 'customer' ? 'provider' : 'customer')} />
              : <Button kind="dark" title="Become a professional" onPress={() => router.push('/onboarding')} />}
          </Card>
          <Group>
            <Row icon={ic(MessageCircle)} label="Messages" right={chev} onPress={() => router.push('/messages')} />
            <Row icon={ic(Heart)} label="Saved professionals" right={chev} onPress={() => router.push('/saved')} />
          </Group>
          <AccountRows />
          <Button kind="danger" title="Sign out" icon={<LogOut size={18} color={colors.danger} />} onPress={signOut} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
