import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { EmptyState, ErrorState, ListSkeleton, ProviderCard } from '@/components/ui';
import { useCompare } from '@/lib/compare';
import { CompareBar } from '@/components/CompareBar';
import { Header } from '@/components/Screen';
import { useSaved } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Saved() {
  const router = useRouter();
  const { signedIn } = useSession();
  const s = useSaved();
  const cmp = useCompare();
  const q = s.query;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Saved professionals" />
      {!signedIn ? (
        <EmptyState icon={<Heart size={28} color={colors.textMuted} />} title="Save professionals you like" body="Sign in to keep a shortlist and come back to it any time." actionLabel="Sign in" onAction={() => router.push('/auth/welcome')} />
      ) : q.isPending ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <FlatList
          data={q.data.items} keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProviderCard p={item} saved onToggleSave={() => s.toggle(item.id)} compared={cmp.has(item.id)} onToggleCompare={() => cmp.toggle(item)} onPress={() => router.push(`/provider/${item.slug}`)} />}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={async () => { await q.refetch(); }} tintColor={colors.teal700} />}
          ListEmptyComponent={<EmptyState icon={<Heart size={28} color={colors.textMuted} />} title="Nothing saved yet" body="Tap the heart on a profile to save it here." actionLabel="Explore professionals" onAction={() => router.push('/explore')} />}
        />
      )}
      <CompareBar />
    </SafeAreaView>
  );
}
