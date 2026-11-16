import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Briefcase, Copy, MapPin, Users } from 'lucide-react-native';
import { Screen, QueryBoundary } from '@/components/Screen';
import { Avatar, Button, ListSkeleton, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { JOB_TYPE_LABEL, jobPayLabel, relativeTime } from '@/lib/format';
import { colors } from '@/lib/theme';

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{icon}<T v="body" style={{ flex: 1 }}>{children}</T></View>;
}

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['job', id], queryFn: () => api.jobs.get(String(id)) });
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    setBusy(true);
    try { const r = await api.jobs.revealPhone(String(id)); setPhone(r.phone); }
    catch (e) { Alert.alert('Contact number', errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <Screen title="Job details" contentStyle={{ padding: 16, gap: 16 }}>
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(j) => (
          <>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.tealTint }}>
                <T v="caption" color={colors.teal800}>{JOB_TYPE_LABEL[j.jobType]}{j.categoryName ? ` · ${j.categoryName}` : ''}</T>
              </View>
              <T v="title" weight={700}>{j.title}</T>
              <T v="heading" color={colors.navy}>{jobPayLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}</T>
            </View>

            <View style={{ gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
              <Row icon={<Users size={16} color={colors.textMuted} />}>{j.openings} opening{j.openings > 1 ? 's' : ''}</Row>
              {(j.locality || j.city) && <Row icon={<MapPin size={16} color={colors.textMuted} />}>{[j.locality, j.city].filter(Boolean).join(', ')}{j.distanceKm != null ? ` · ${j.distanceKm} km away` : ''}</Row>}
              <Row icon={<Briefcase size={16} color={colors.textMuted} />}>Posted {relativeTime(j.createdAt)}{j.closesAt ? ` · closes ${new Date(j.closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</Row>
            </View>

            <View style={{ gap: 6 }}>
              <T v="label" weight={600}>About the role</T>
              <T v="body" style={{ lineHeight: 22 }}>{j.description}</T>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 }}>
              <Avatar name={j.providerName} url={j.providerAvatarUrl} size={40} />
              <View style={{ flex: 1 }}><T weight={600}>{j.providerName}</T><T v="caption">Posted this job</T></View>
            </View>

            <Button title="Show contact number" loading={busy} onPress={reveal} size="lg" />
            <T v="caption" color={colors.textMuted} align="center">You apply directly with the employer — calls, messages and your resume are shared outside help and are not handled by the app.</T>

            <Sheet visible={!!phone} onClose={() => setPhone(null)} title="Contact number">
              <T style={{ fontSize: 28, lineHeight: 34 }} weight={700} color={colors.navy} selectable>{phone}</T>
              <T v="caption" color={colors.textMuted} style={{ marginTop: 4 }}>Call or message {j.providerName} directly about “{j.title}”.</T>
              <Button title="Copy number" icon={<Copy size={18} color="#fff" />} style={{ marginTop: 16 }} onPress={async () => { await Clipboard.setStringAsync(phone ?? ''); Alert.alert('Copied', 'Contact number copied to clipboard.'); }} />
            </Sheet>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
