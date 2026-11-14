import React from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react-native';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Button, Card, EmptyState, ListSkeleton, Pill, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Sessions() {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const q = useQuery({ queryKey: ['sessions'], queryFn: () => api.auth.sessions() });
  const revoke = useMutation({
    mutationFn: (id: string) => api.auth.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e) => Alert.alert('Could not log out device', errorMessage(e)),
  });
  return (
    <Screen title="Devices and sessions" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 12 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>
        {(list) => list.length === 0 ? <EmptyState title="No active sessions" /> : (
          <>
            {list.map((s) => (
              <Card key={s.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Smartphone size={22} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <T v="label" weight={600}>{s.deviceName ?? s.platform}</T>
                    <T v="caption">Last active {formatDateTime(s.lastUsedAt)}</T>
                  </View>
                  {s.current ? <Pill label="This device" bg={colors.successBg} fg={colors.successFg} /> : null}
                </View>
                {s.current ? <Button kind="secondary" size="sm" title="Log out" onPress={signOut} /> : (
                  <Button kind="danger" size="sm" title="Log out this device" loading={revoke.isPending && revoke.variables === s.id} onPress={() => Alert.alert('Log out this device?', 'It will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => revoke.mutate(s.id) }])} />
                )}
              </Card>
            ))}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
