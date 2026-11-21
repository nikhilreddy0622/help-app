import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateReviewSchema } from '@help/validation';
import { QueryBoundary, Screen } from '@/components/Screen';
import { Button, Input, ListSkeleton, StarInput, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/lib/theme';

const SUBS = [['quality', 'Quality of work'], ['behaviour', 'Behaviour'], ['punctuality', 'Punctuality'], ['value', 'Value for money'], ['communication', 'Communication']] as const;
type Sub = (typeof SUBS)[number][0];

export default function WriteReview() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const elig = useQuery({ queryKey: ['eligibility', providerId], queryFn: () => api.reviews.eligibility(providerId!) });
  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState<Record<Sub, number>>({ quality: 0, behaviour: 0, punctuality: 0, value: 0, communication: 0 });
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => {
      const r = CreateReviewSchema.safeParse({ providerId, overall, ...subs, comment: comment.trim() || undefined });
      if (!r.success) throw new Error('Please rate every category from 1 to 5 stars.');
      return api.reviews.create(r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eligibility'] }); qc.invalidateQueries({ queryKey: ['provider'] }); qc.invalidateQueries({ queryKey: ['reviews'] }); qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['conversation'] }); Alert.alert('Thank you', 'Your review has been posted.'); router.back(); },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Screen title="Write a review" keyboard contentStyle={{ padding: 16, gap: 24 }}
      footer={elig.data?.canReview ? <>{error ? <T v="caption" color={colors.danger} align="center">{error}</T> : null}<Button size="lg" title="Post review" loading={submit.isPending} onPress={() => { setError(null); submit.mutate(); }} /></> : undefined}>
      <QueryBoundary q={elig} skeleton={<ListSkeleton count={1} />}>
        {(e) => !e.canReview ? (
          <T color={colors.textMuted}>{e.reason === 'ALREADY_REVIEWED' ? 'You have already reviewed this professional.' : e.reason === 'SIGNED_OUT' ? 'Sign in to write a review.' : e.reason === 'SELF' ? 'You cannot review yourself.' : 'Chat with this professional or view their number first, then you can rate them.'}</T>
        ) : (
          <>
            <View style={{ gap: 8, alignItems: 'center' }}>
              <T v="heading">How was your experience?</T>
              <StarInput label="Overall" value={overall} onChange={setOverall} size={36} />
            </View>
            <View style={{ backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
              {SUBS.map(([k, l], i) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                  <T weight={600} style={{ flex: 1 }} numberOfLines={1}>{l}</T>
                  <StarInput label={l} size={20} value={subs[k]} onChange={(n) => setSubs((s) => ({ ...s, [k]: n }))} />
                </View>
              ))}
            </View>
            <Input label="Comments (optional)" multiline value={comment} onChangeText={setComment} maxLength={2000} placeholder="What went well? What could be better?" />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
