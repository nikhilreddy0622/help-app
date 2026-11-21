import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { BrandLoader } from '@/components/Logo';
import { Button, ErrorState, Stepper, T } from '@/components/ui';
import { Ctx, EMPTY_DRAFT, type Draft } from '@/components/onboarding/ctx';
import { StepAbout, StepWhere, StepYou } from '@/components/onboarding/setup';
import { StepAvailability, StepPlan, StepPortfolio, StepPricing, StepVerification } from '@/components/onboarding/steps2';
import { api, kv, setKv } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

/** First-time setup is four short steps. Everything else (intro, hours, photos, verification) is edited later from the profile. */
const SETUP = [
  { key: 'you', title: 'About you', hint: 'Who you are and what you do' },
  { key: 'where', title: 'Where and when', hint: 'So nearby customers can find you' },
  { key: 'services', title: 'Services and prices', hint: 'What you offer and from how much' },
  { key: 'plan', title: 'Go live', hint: 'Check your profile and choose a plan' },
] as const;

export type Section = 'you' | 'where' | 'services' | 'plan' | 'about' | 'hours' | 'portfolio' | 'verification';
const EDIT_TITLES: Record<Section, string> = {
  you: 'Name, photo and profession', where: 'Location and radius', services: 'Services and prices', plan: 'Plan',
  about: 'Intro, skills and languages', hours: 'Working hours', portfolio: 'Work photos', verification: 'Verification',
};

export default function Onboarding() {
  const { section: s0, edit } = useLocalSearchParams<{ section?: Section; edit?: string }>();
  const isEdit = edit === '1';
  const router = useRouter();
  const qc = useQueryClient();
  const { me, refreshMe, switchMode, requireAuth } = useSession();
  const startIdx = Math.max(0, SETUP.findIndex((x) => x.key === s0));
  const [step, setStep] = useState(isEdit ? 0 : startIdx);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = useRef<(() => Promise<boolean>) | null>(null);
  const register = useCallback((fn: (() => Promise<boolean>) | null) => { save.current = fn; }, []);
  const mine = useQuery({ queryKey: ['my-provider'], queryFn: () => api.providers.mine(), enabled: !!me });

  useEffect(() => { if (!me) requireAuth(); }, [me, requireAuth]);

  // Hydrate from the server profile, else from the locally saved draft.
  useEffect(() => {
    if (hydrated || mine.isPending || !me) return;
    (async () => {
      const p = mine.data;
      if (p) {
        setDraft({ displayName: p.displayName, headline: p.headline ?? '', avatarUrl: p.avatarUrl ?? undefined, primaryCategoryId: p.primaryCategoryId ?? undefined, experienceYears: p.experienceYears, bio: p.bio ?? '', qualifications: p.qualifications, languages: p.languages, skills: p.skills });
      } else {
        const raw = await kv('help.onboardDraft');
        if (raw) { try { setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(raw) as Draft) }); } catch { /* ignore */ } }
        else setDraft((d) => ({ ...d, displayName: me.name ?? '', avatarUrl: me.avatarUrl ?? undefined }));
      }
      setHydrated(true);
    })();
  }, [mine.data, mine.isPending, hydrated, me]);

  const patchDraft = useCallback((p: Partial<Draft>) => setDraft((d) => { const n = { ...d, ...p }; setKv('help.onboardDraft', JSON.stringify(n)); return n; }), []);
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['my-provider'] }); await qc.invalidateQueries({ queryKey: ['preview'] }); await refreshMe(); return mine.refetch(); }, [qc, refreshMe, mine]);

  const last = SETUP.length - 1;
  const exit = useCallback(() => Alert.alert('Leave setup?', 'Your progress is saved. Continue any time from your profile.', [{ text: 'Stay', style: 'cancel' }, { text: 'Leave', onPress: () => router.back() }]), [router]);
  const back = useCallback(() => {
    if (isEdit) return false;
    if (step > 0) setStep(step - 1); else exit();
    return true;
  }, [step, isEdit, exit]);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', back); return () => sub.remove(); }, [back]);

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

  if (!me) return <Screen title="Set up profile">{null}</Screen>;
  if (mine.isError) return <Screen title="Set up profile"><ErrorState error={mine.error} onRetry={() => mine.refetch()} /></Screen>;
  if (!hydrated) return <Screen title="Set up profile"><BrandLoader full={false} /></Screen>;

  const section: Section = isEdit ? (s0 ?? 'you') : SETUP[step]!.key;
  const body = {
    you: <StepYou />, where: <StepWhere />, services: <StepPricing />, plan: <StepPlan onDone={finish} onLater={finish} />,
    about: <StepAbout />, hours: <StepAvailability />, portfolio: <StepPortfolio />, verification: <StepVerification />,
  }[section];
  const noFooter = section === 'plan' || ((section === 'portfolio' || section === 'verification') && isEdit);
  return (
    <Ctx.Provider value={{ provider: mine.data ?? null, draft, patchDraft, refresh, register, go: setStep }}>
      <Screen
        title={isEdit ? EDIT_TITLES[section] : 'Become a professional'} keyboard
        onBack={isEdit ? undefined : () => back()}
        contentStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
        footer={noFooter ? null : (
          <Button size="lg" title={isEdit ? 'Save' : step === last - 1 ? 'Continue to go live' : 'Continue'} loading={busy} onPress={next} />
        )}
      >
        {!isEdit ? (
          <View style={{ gap: 6 }}>
            <Stepper step={step} total={SETUP.length} title={SETUP[step]!.title} />
            <T v="caption" color={colors.textMuted}>{SETUP[step]!.hint}</T>
          </View>
        ) : null}
        <React.Fragment key={section}>{body}</React.Fragment>
      </Screen>
    </Ctx.Provider>
  );
}
