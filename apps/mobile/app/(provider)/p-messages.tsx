import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellButton } from '@/components/Screen';
import { ConversationList } from '@/components/ConversationList';
import { T } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function ProviderMessages() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
        <View><T v="display" style={{ fontSize: 26, lineHeight: 32 }}>Messages</T><T v="caption">Customers who contacted you</T></View>
        <BellButton />
      </View>
      <ConversationList role="provider" />
    </SafeAreaView>
  );
}
