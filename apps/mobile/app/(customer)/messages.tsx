import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BellButton } from '@/components/Screen';
import { ConversationList } from '@/components/ConversationList';
import { EmptyState, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function CustomerMessages() {
  const router = useRouter();
  const { signedIn } = useSession();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
        <T v="title">Messages</T>
        <BellButton />
      </View>
      {signedIn ? <ConversationList role="customer" emptyAction="Find a professional" onEmptyAction={() => router.push('/explore')} />
        : <EmptyState title="Sign in to chat" body="Your conversations with professionals will show up here." actionLabel="Sign in" onAction={() => router.push('/auth/welcome')} />}
    </SafeAreaView>
  );
}
