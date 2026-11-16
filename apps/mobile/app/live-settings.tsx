import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, QueryBoundary } from '@/components/Screen';
import { Card, ListSkeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function LiveSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['live-settings'], queryFn: () => api.liveRequests.settings() });
  const [accepts, setAccepts] = useState(true);
  useEffect(() => { if (q.data) setAccepts(q.data.acceptsLiveRequests); }, [q.data]);

  const save = useMutation({
    mutationFn: (v: boolean) => api.liveRequests.setSettings({ acceptsLiveRequests: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-settings'] }),
    onError: (e) => { setAccepts((x) => !x); Alert.alert('Could not save', errorMessage(e)); },
  });

  return (
    <Screen title="Live requests" contentStyle={{ padding: 16, gap: 14 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={1} />}>
        {() => (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T weight={600}>Accept live requests</T>
                  <T v="caption" color={colors.textMuted}>When on, customers nearby who need your service right now can alert you. You choose whether to respond.</T>
                </View>
                <Switch value={accepts} onValueChange={(v) => { setAccepts(v); save.mutate(v); }} trackColor={{ true: colors.teal700 }} />
              </View>
            </Card>
            <T v="caption" color={colors.textMuted}>You only receive live requests in your primary category while your status is Available. Hiring and payment happen directly with the customer, outside the app.</T>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
