import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JobType } from '@help/types';
import { JobPostingSchema } from '@help/validation';
import { Screen } from '@/components/Screen';
import { Button, Input, Segmented, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useCategories } from '@/lib/hooks';
import { Chip } from '@/components/ui';
import { colors } from '@/lib/theme';

const TYPE_OPTIONS: { key: JobType; label: string }[] = [
  { key: 'FULL_TIME', label: 'Full-time' }, { key: 'PART_TIME', label: 'Part-time' }, { key: 'GIG', label: 'Gig' },
];

type Form = {
  title: string; description: string; jobType: JobType; categoryId: string | undefined;
  payMin: string; payMax: string; payUnit: string; city: string; locality: string; openings: string;
};
const EMPTY: Form = { title: '', description: '', jobType: 'FULL_TIME', categoryId: undefined, payMin: '', payMax: '', payUnit: 'month', city: '', locality: '', openings: '1' };

export default function JobEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const router = useRouter();
  const qc = useQueryClient();
  const cats = useCategories();
  const existing = useQuery({ queryKey: ['job', id], queryFn: () => api.jobs.get(String(id)), enabled: editing });
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editing && existing.data) {
      const j = existing.data;
      setF({
        title: j.title, description: j.description, jobType: j.jobType, categoryId: undefined,
        payMin: j.payMinPaise ? String(j.payMinPaise / 100) : '', payMax: j.payMaxPaise ? String(j.payMaxPaise / 100) : '',
        payUnit: j.payUnit ?? 'month', city: j.city ?? '', locality: j.locality ?? '', openings: String(j.openings),
      });
    }
  }, [editing, existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title: f.title.trim(), description: f.description.trim(), jobType: f.jobType, categoryId: f.categoryId,
        payMinPaise: f.payMin ? Math.round(Number(f.payMin) * 100) : undefined,
        payMaxPaise: f.payMax ? Math.round(Number(f.payMax) * 100) : undefined,
        payUnit: f.payUnit.trim() || undefined, city: f.city.trim() || undefined, locality: f.locality.trim() || undefined,
        openings: Math.max(1, Number(f.openings) || 1),
      };
      const parsed = JobPostingSchema.safeParse(body);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
        setErrors(errs);
        throw new Error('Please fix the highlighted fields.');
      }
      setErrors({});
      return editing ? api.jobs.update(String(id), parsed.data) : api.jobs.create(parsed.data);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['my-jobs'] }); router.back(); },
    onError: (e) => { if (!Object.keys(errors).length) Alert.alert('Could not save', errorMessage(e)); },
  });

  const set = (patch: Partial<Form>) => setF((o) => ({ ...o, ...patch }));
  const groups = (cats.data ?? []).filter((c) => !c.parentId);

  return (
    <Screen
      title={editing ? 'Edit job posting' : 'Post a job'}
      contentStyle={{ padding: 16, gap: 16 }}
      footer={<View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}><Button title={editing ? 'Save changes' : 'Post job'} loading={save.isPending} onPress={() => save.mutate()} /></View>}
    >
      <Input label="Job title" value={f.title} onChangeText={(v) => set({ title: v })} placeholder="e.g. Helper electrician" error={errors.title} maxLength={100} />
      <Input label="Description" value={f.description} onChangeText={(v) => set({ description: v })} placeholder="What the work involves, timing, requirements…" multiline error={errors.description} maxLength={2000} />

      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>Job type</T>
        <Segmented value={f.jobType} onChange={(k) => set({ jobType: k })} options={TYPE_OPTIONS} />
      </View>

      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>Category (optional)</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {groups.map((c) => <Chip key={c.id} label={c.name} selected={f.categoryId === c.id} onPress={() => set({ categoryId: f.categoryId === c.id ? undefined : c.id })} />)}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>Pay (optional)</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="From ₹" value={f.payMin} onChangeText={(v) => set({ payMin: v.replace(/[^0-9]/g, '') })} inputMode="numeric" error={errors.payMinPaise} /></View>
          <View style={{ flex: 1 }}><Input label="To ₹" value={f.payMax} onChangeText={(v) => set({ payMax: v.replace(/[^0-9]/g, '') })} inputMode="numeric" /></View>
        </View>
        <Segmented value={f.payUnit} onChange={(k) => set({ payUnit: k })} options={[{ key: 'month', label: '/month' }, { key: 'day', label: '/day' }, { key: 'hour', label: '/hour' }]} compact />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.4 }}><Input label="City" value={f.city} onChangeText={(v) => set({ city: v })} placeholder="Bengaluru" /></View>
        <View style={{ flex: 1 }}><Input label="Openings" value={f.openings} onChangeText={(v) => set({ openings: v.replace(/[^0-9]/g, '') })} inputMode="numeric" /></View>
      </View>
      <Input label="Area / locality (optional)" value={f.locality} onChangeText={(v) => set({ locality: v })} placeholder="e.g. Koramangala" />

      <T v="caption" color={colors.textMuted}>Job seekers will see this posting and your contact number. Hiring, interviews and resumes happen outside help.</T>
    </Screen>
  );
}
