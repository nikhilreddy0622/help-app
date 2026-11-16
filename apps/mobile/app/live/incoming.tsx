import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, MapPin, Radio, Zap } from 'lucide-react-native';
import type { IncomingLiveRequest } from '@help/types';
import { Screen, QueryBoundary } from '@/components/Screen';
import { Button, Card, EmptyState, Input, ListSkeleton, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { useLocation } from '@/lib/location';
import { colors } from '@/lib/theme';

export default function LiveIncoming() {
  const qc = useQueryClient();
  const loc = useLocation();
  const q = useQuery({ queryKey: ['live-incoming'], queryFn: () => api.liveRequests.incoming({ lat: loc.coords.lat, lng: loc.coords.lng }), refetchInterval: 15_000 });
  const [respondTo, setRespondTo] = useState<IncomingLiveRequest | null>(null);
  const [eta, setEta] = useState('');
  const [msg, setMsg] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['live-incoming'] });
  const respond = useMutation({
    mutationFn: () => api.liveRequests.respond(respondTo!.id, { etaMinutes: eta ? Number(eta) : undefined, message: msg.trim() || undefined }),
    onSuccess: () => { refresh(); setRespondTo(null); setEta(''); setMsg(''); },
    onError: (e) => Alert.alert('Could not respond', errorMessage(e)),
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => api.liveRequests.withdraw(id),
    onSuccess: refresh, onError: (e) => Alert.alert('Could not withdraw', errorMessage(e)),
  });

  return (
    <Screen title="Live requests" subtitle="Customers who need help now" onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 16, gap: 12 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(items) => items.length === 0 ? (
          <EmptyState icon={<Radio size={28} color={colors.textMuted} />} title="No live requests right now" body="When a customer nearby needs your service, it shows here. Keep your status Available to receive them." />
        ) : (
          items.map((r) => {
            const mine = r.myResponse?.status === 'INTERESTED';
            return (
              <Card key={r.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {r.urgent && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FEE2E2' }}><Zap size={12} color={colors.danger} /><T v="caption" color={colors.danger}>Urgent</T></View>}
                  <T v="heading" style={{ flex: 1 }}>{r.categoryName}</T>
                  {r.distanceKm != null && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MapPin size={13} color={colors.textMuted} /><T v="caption">{r.distanceKm} km</T></View>}
                </View>
                {r.note ? <T v="body" color={colors.text}>{r.note}</T> : <T v="caption" color={colors.textMuted}>No extra details.</T>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Clock size={13} color={colors.textMuted} /><T v="caption" color={colors.textMuted}>Posted {relativeTime(r.createdAt)}</T></View>
                {mine ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Check size={16} color={colors.teal700} /><T v="caption" color={colors.teal800}>You responded{r.myResponse?.etaMinutes != null ? ` · ETA ~${r.myResponse.etaMinutes}m` : ''}</T></View>
                    <Button kind="ghost" size="sm" title="Withdraw" onPress={() => withdraw.mutate(r.id)} />
                  </View>
                ) : (
                  <Button title="I can help" onPress={() => { setRespondTo(r); setEta(''); setMsg(''); }} />
                )}
              </Card>
            );
          })
        )}
      </QueryBoundary>

      <Sheet visible={!!respondTo} onClose={() => setRespondTo(null)} title="Respond to this request"
        footer={<View style={{ padding: 16 }}><Button title="Send response" loading={respond.isPending} onPress={() => respond.mutate()} /></View>}>
        <View style={{ gap: 12, paddingHorizontal: 4 }}>
          <T v="caption" color={colors.textMuted}>The customer sees your name, rating and distance, and picks who to contact. Hiring happens directly with them.</T>
          <Input label="ETA in minutes (optional)" value={eta} onChangeText={(v) => setEta(v.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="e.g. 15" />
          <Input label="Message (optional)" value={msg} onChangeText={setMsg} placeholder="e.g. On my way, have tools ready" multiline maxLength={240} />
        </View>
      </Sheet>
    </Screen>
  );
}
