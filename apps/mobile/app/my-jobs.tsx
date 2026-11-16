import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react-native';
import type { MyJobPosting } from '@help/types';
import { Screen, QueryBoundary } from '@/components/Screen';
import { Button, Card, EmptyState, ListSkeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { JOB_TYPE_LABEL, jobPayLabel, relativeTime } from '@/lib/format';
import { colors } from '@/lib/theme';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: colors.teal800, bg: colors.tealTint },
  PAUSED: { label: 'Paused', color: '#334155', bg: colors.surfaceMuted },
  CLOSED: { label: 'Closed', color: '#334155', bg: colors.surfaceMuted },
};

export default function MyJobs() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-jobs'], queryFn: () => api.jobs.mine() });

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-jobs'] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'OPEN' | 'PAUSED' | 'CLOSED' }) => api.jobs.setStatus(id, status),
    onSuccess: refresh, onError: (e) => Alert.alert('Could not update', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.jobs.remove(id),
    onSuccess: refresh, onError: (e) => Alert.alert('Could not delete', errorMessage(e)),
  });

  const confirmDelete = (j: MyJobPosting) =>
    Alert.alert('Delete this posting?', `“${j.title}” will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(j.id) },
    ]);

  return (
    <Screen
      title="My job postings"
      subtitle="Hire helpers for your work"
      onRefresh={async () => { await q.refetch(); }}
      contentStyle={{ padding: 16, gap: 12 }}
      footer={<View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}><Button title="Post a new job" icon={<Plus size={18} color="#fff" />} onPress={() => router.push('/job/edit')} /></View>}
    >
      <QueryBoundary q={q} skeleton={<ListSkeleton count={3} />}>
        {(jobs) => jobs.length === 0 ? (
          <EmptyState title="No job postings yet" body="Hiring help for your work? Post a job and job seekers nearby can reach you directly." actionLabel="Post a job" onAction={() => router.push('/job/edit')} />
        ) : (
          <>
            {jobs.map((j) => {
              const s = STATUS_STYLE[j.status]!;
              return (
                <Card key={j.id}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <T v="heading" style={{ flex: 1 }} numberOfLines={2}>{j.title}</T>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: s.bg }}><T v="caption" color={s.color}>{s.label}</T></View>
                    </View>
                    <T weight={700} color={colors.navy}>{jobPayLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}</T>
                    <T v="caption" color={colors.textMuted}>{JOB_TYPE_LABEL[j.jobType]} · {j.openings > 1 ? `${j.openings} openings · ` : ''}updated {relativeTime(j.updatedAt)}</T>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <Button kind="secondary" size="sm" title="Edit" icon={<Pencil size={15} color={colors.navy} />} onPress={() => router.push({ pathname: '/job/edit', params: { id: j.id } })} />
                      {j.status === 'OPEN'
                        ? <Button kind="secondary" size="sm" title="Pause" icon={<EyeOff size={15} color={colors.navy} />} loading={setStatus.isPending} onPress={() => setStatus.mutate({ id: j.id, status: 'PAUSED' })} />
                        : <Button kind="secondary" size="sm" title="Reopen" icon={<Eye size={15} color={colors.navy} />} loading={setStatus.isPending} onPress={() => setStatus.mutate({ id: j.id, status: 'OPEN' })} />}
                      <Button kind="ghost" size="sm" title="Delete" icon={<Trash2 size={15} color={colors.danger} />} onPress={() => confirmDelete(j)} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
