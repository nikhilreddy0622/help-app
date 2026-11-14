import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { BrandLoader } from '@/components/Logo';
import { Button, ErrorState, Stepper } from '@/components/ui';
import { Ctx, EMPTY_DRAFT, type Draft } from '@/components/onboarding/ctx';
import { StepBasics, StepLocation, StepProfession } from '@/components/onboarding/steps1';
import { StepAvailability, StepPlan, StepPortfolio, StepPricing, StepVerification } from '@/components/onboarding/steps2';
import { api, kv, setKv } from '@/lib/api';
import { useSession } from '@/lib/session';

const TITLES = ['About you', 'Your work', 'Where you work', 'Services and pricing', 'Weekly availability', 'Portfolio', 'Verification', 'Preview and plan'];

export default function Onboarding() {
  const { step: s0, edit } = useLocalSearchParams<{ step?: string; edit?: string }>();
  const isEdit = edit === '1';
  const router = useRouter();
  const qc = useQueryClient();
  const { me, refreshMe, switchMode, requireAuth } = useSession();
  const [step, setStep] = useState(Number(s0 ?? 0));
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = useRef<(() => Promise<boolean>) | null>(null);
  const register = useCallback((fn: (() => Promise<boolean>) | null) => { save.current = fn; }, []);

  const mine = useQuery({ queryKey: ['my-provider'], queryFn: () => api.providers.mine(), enabled: !!me });

  useEffect(() => { if (!me) requireAuth(); }, [me, requireAuth]);

  // Hydrate the draft from the server profile, else from the locally saved draft.
  useEffect(() => {
    if (hydrated || mine.isPending || !me) return;
    (async () => {
      const p = mine.data;
      if (p) {
        setDraft({ displayName: p.displayName, headline: p.headline ?? '', avatarUrl: p.avatarUrl ?? undefined, primaryCategoryId: p.primaryCategoryId ?? undefined, experienceYears: p.experienceYears, bio: p.bio ?? '', qualifications: p.qualifications, languages: p.languages, skills: p.skills });
      } else {
        const raw = await kv('help.onboardDraft');
        if (raw) { try { setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(raw) as Draft) }); } catch { /* ignore */ } }
        else setDraft((d) => ({ ...d, displayName: me.name ?? '' }));
      }
      setHydrated(true);
    })();
  }, [mine.data, mine.isPending, hydrated, me]);

  const patchDraft = useCallback((p: Partial<Draft>) => setDraft((d) => { const n = { ...d, ...p }; setKv('help.onboardDraft', JSON.stringify(n)); return n; }), []);
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['my-provider'] }); await qc.invalidateQueries({ queryKey: ['preview'] }); await refreshMe(); return mine.refetch(); }, [qc, refreshMe, mine]);

  const last = TITLES.length - 1;
  const back = useCallback(() => { if (step > 0 && !isEdit) { setStep(step - 1); return true; } return false; }, [step, isEdit]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const finish = async () => { await setKv('help.onboardDraft', null); await refreshMe(); await switchMode('provider'); };

  const next = async () => {
    setBusy(true);
    try {
      const ok = save.current ? await save.current() : true;
      if (!ok) return;
      if (isEdit) { await qc.invalidateQueries(); router.back(); return; }
      setStep((x) => Math.min(last, x + 1));
    } finally { setBusy(false); }
  };

  const exit = () => Alert.alert('Leave setup?', 'Your progress is saved as a draft. Continue any time from your profile.', [{ text: 'Stay', style: 'cancel' }, { text: 'Leave', onPress: () => router.back() }]);

  if (!me) return <Screen title="Set up profile" back>{null}</Screen>;
  if (mine.isError) return <Screen title="Set up profile"><ErrorState error={mine.error} onRetry={() => mine.refetch()} /></Screen>;
  if (!hydrated) return <Screen title="Set up profile"><BrandLoader full={false} /></Screen>;

  const body = [<StepBasics key={0} />, <StepProfession key={1} />, <StepLocation key={2} />, <StepPricing key={3} />, <StepAvailability key={4} />, <StepPortfolio key={5} />, <StepVerification key={6} />, <StepPlan key={7} onDone={finish} />][step];
  const skippable = step === 5 || step === 6;
  return (
    <Ctx.Provider value={{ provider: mine.data ?? null, draft, patchDraft, refresh, register, go: setStep }}>
      <Screen
        title={isEdit ? 'Edit profile' : 'Set up your profile'} keyboard onBack={isEdit ? undefined : () => (step > 0 ? setStep(step - 1) : exit())}
        contentStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
        footer={step === last && !isEdit ? null : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {skippable && !isEdit ? <Button kind="secondary" title="Skip" style={{ flex: 1 }} onPress={() => setStep(step + 1)} /> : null}
            <Button size="lg" title={isEdit ? 'Save' : 'Save and continue'} loading={busy} style={{ flex: 2 }} onPress={next} />
          </View>
        )}
      >
        {!isEdit ? <Stepper step={step} total={TITLES.length} title={TITLES[step]!} /> : null}
        <React.Fragment key={step}>{body}</React.Fragment>
      </Screen>
    </Ctx.Provider>
  );
}
