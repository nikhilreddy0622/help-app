import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Clock, Copy, MapPin, Radio, Zap } from 'lucide-react-native';
import type { LiveResponder } from '@help/types';
import { Screen, QueryBoundary } from '@/components/Screen';
import { Avatar, Button, Card, EmptyState, ListSkeleton, Rating, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function LiveStatus() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['live-mine'], queryFn: () => api.liveRequests.mine(), refetchInterval: 15_000 });
  const [picked, setPicked] = useState<{ phone: string | null; name: string } | null>(null);

  const cancel = useMutation({
    mutationFn: () => api.liveRequests.cancel(q.data!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['live-mine'] }); router.back(); },
    onError: (e) => Alert.alert('Could not cancel', errorMessage(e)),
  });
  const connect = useMutation({
    mutationFn: (r: LiveResponder) => api.liveRequests.connect(q.data!.id, r.providerId).then((res) => ({ res, r })),
    onSuccess: ({ res, r }) => {
      qc.invalidateQueries({ queryKey: ['live-mine'] });
      if (res.conversationId) router.replace(`/chat/${res.conversationId}`);
      else setPicked({ phone: res.phone, name: r.displayName });
    },
    onError: (e) => Alert.alert('Could not connect', errorMessage(e)),
  });

  return (
    <Screen title="Your request" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 14 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(req) => !req ? (
          <EmptyState icon={<Radio size={28} color={colors.textMuted} />} title="No active request" body="Post a request and available pros nearby can respond." actionLabel="Request now" onAction={() => router.replace('/live/new')} />
        ) : (
          <>
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {req.urgent && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FEE2E2' }}><Zap size={12} color={colors.danger} /><T v="caption" color={colors.danger}>Urgent</T></View>}
                <T v="heading" style={{ flex: 1 }}>{req.categoryName}</T>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: req.status === 'OPEN' ? colors.tealTint : colors.surfaceMuted }}>
                  <T v="caption" color={req.status === 'OPEN' ? colors.teal800 : colors.textMuted}>{req.status === 'OPEN' ? 'Live' : req.status === 'CONNECTED' ? 'Connected' : 'Closed'}</T>
                </View>
              </View>
              {req.note ? <T v="body" color={colors.text}>{req.note}</T> : null}
              {req.status === 'OPEN' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Clock size={14} color={colors.textMuted} /><T v="caption" color={colors.textMuted}>Waiting for pros to respond… expires {new Date(req.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</T></View>}
            </Card>

            <T v="label" weight={600}>{req.responders.length > 0 ? `${req.responders.length} professional${req.responders.length > 1 ? 's' : ''} responded` : 'Responders'}</T>
            {req.responders.length === 0 ? (
              <Card><T color={colors.textMuted}>No responses yet. Pros nearby are being alerted — hang tight.</T></Card>
            ) : req.responders.map((r) => (
              <Card key={r.providerId} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={r.displayName} url={r.avatarUrl} size={44} />
                  <View style={{ flex: 1 }}>
                    <T weight={600}>{r.displayName}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Rating avg={r.ratingAvg} count={r.ratingCount} />
                      {r.distanceKm != null && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MapPin size={12} color={colors.textMuted} /><T v="caption">{r.distanceKm} km</T></View>}
                    </View>
                  </View>
                  {r.etaMinutes != null && <View style={{ alignItems: 'flex-end' }}><T weight={700} color={colors.navy}>~{r.etaMinutes}m</T><T v="caption" color={colors.textMuted}>ETA</T></View>}
                </View>
                {r.message ? <T v="caption" color={colors.text}>“{r.message}”</T> : null}
                {req.status === 'OPEN' && <Button title="Connect" loading={connect.isPending} onPress={() => connect.mutate(r)} />}
              </Card>
            ))}

            {req.status === 'OPEN' && <Button kind="ghost" title="Cancel request" loading={cancel.isPending} onPress={() => cancel.mutate()} />}

            <Sheet visible={!!picked} onClose={() => setPicked(null)} title={`${picked?.name ?? ''}’s number`}>
              {picked?.phone ? (
                <>
                  <T style={{ fontSize: 28, lineHeight: 34 }} weight={700} color={colors.navy} selectable>{picked.phone}</T>
                  <Button title="Copy number" icon={<Copy size={18} color="#fff" />} style={{ marginTop: 16 }} onPress={async () => { await Clipboard.setStringAsync(picked.phone ?? ''); Alert.alert('Copied', 'Number copied.'); }} />
                </>
              ) : <T color={colors.textMuted}>This professional prefers to be contacted in chat.</T>}
            </Sheet>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
