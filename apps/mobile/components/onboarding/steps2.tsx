import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus, Plus, ShieldCheck, Trash2, Award } from 'lucide-react-native';
import { ServiceOfferingSchema } from '@help/validation';
import type { ServiceOffering, SubscriptionPlanDto } from '@help/types';
import { IconButton } from '@/components/Screen';
import { TimeField } from '@/components/TimeField';
import { Button, Card, Chip, Input, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { WEEKDAYS, formatINR, minuteLabel, priceLabel } from '@/lib/format';
import { openRazorpaySubscription } from '@/lib/razorpay';
import { useSession } from '@/lib/session';
import { askPushPermission } from '@/lib/push';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import { useRegisterSave, useStep } from './ctx';
import { ServiceSuggestions } from './setup';

const UNITS: [string, string][] = [['PER_VISIT', 'Per visit'], ['HOURLY', 'Per hour'], ['FIXED', 'Fixed'], ['STARTING_AT', 'Starting at'], ['PER_DAY', 'Per day'], ['PER_SESSION', 'Per session']];

export function StepPricing() {
  const { provider, refresh } = useStep();
  const [editing, setEditing] = useState<Partial<ServiceOffering> | null>(null);
  const [title, setTitle] = useState('');
  const [rupees, setRupees] = useState('');
  const [unit, setUnit] = useState('PER_VISIT');
  const [negotiable, setNegotiable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = (s: Partial<ServiceOffering>) => {
    setEditing(s); setTitle(s.title ?? ''); setRupees(s.pricePaise != null ? String(s.pricePaise / 100) : ''); setUnit(s.priceUnit ?? 'PER_VISIT'); setNegotiable(!!s.negotiable); setErr(null);
  };
  const save = async () => {
    const r = ServiceOfferingSchema.safeParse({ title: title.trim(), priceUnit: unit, pricePaise: Math.round(Number(rupees || 0) * 100), negotiable });
    if (!r.success) return setErr(r.error.issues[0]?.message ?? 'Check the details');
    setBusy(true);
    try {
      if (editing?.id) await api.providers.updateService(editing.id, r.data); else await api.providers.addService(r.data);
      await refresh(); setEditing(null);
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const remove = (s: ServiceOffering) => Alert.alert('Remove service?', s.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => api.providers.deleteService(s.id).then(refresh).catch((e) => Alert.alert('Could not remove', errorMessage(e))) }]);

  useRegisterSave(async () => {
    if (!provider?.services.length) { Alert.alert('Add at least one service', 'Customers need to see what you offer and what it costs.'); return false; }
    return true;
  });

  return (
    <View style={{ gap: 12 }}>
      {(provider?.services ?? []).map((s) => (
        <Card key={s.id} onPress={() => open(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T v="label" weight={600}>{s.title}</T><T v="caption">{priceLabel(s.pricePaise, s.priceUnit)}{s.negotiable ? ' · negotiable' : ''}</T></View>
          <IconButton label={`Remove ${s.title}`} icon={<Trash2 size={18} color={colors.danger} />} onPress={() => remove(s)} />
        </Card>
      ))}
      {!provider?.services.length ? <T color={colors.textMuted}>Add what you offer and a starting price. Customers pick people who show prices.</T> : null}
      <ServiceSuggestions taken={(provider?.services ?? []).map((s) => s.title)} onPick={(title) => open({ title })} />
      <Button kind="secondary" title={provider?.services.length ? 'Add another service' : 'Add a service'} icon={<Plus size={18} color={colors.navy} />} onPress={() => open({})} />
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit service' : 'New service'} footer={<Button title="Save service" loading={busy} onPress={save} />}>
        <Input label="Service name" value={title} onChangeText={setTitle} placeholder="e.g. Fan installation" />
        <Input label={'Price (₹)'} keyboardType="number-pad" value={rupees} onChangeText={(t) => setRupees(t.replace(/[^\d]/g, ''))} hint={rupees ? formatINR(Number(rupees) * 100) : undefined} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{UNITS.map(([k, l]) => <Chip key={k} label={l} selected={unit === k} onPress={() => setUnit(k)} />)}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><T>Price is negotiable</T><Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" /></View>
        {err ? <T v="caption" color={colors.danger}>{err}</T> : null}
      </Sheet>
    </View>
  );
}

type Range = { start: number; end: number };
function RangeRow({ r, onChange, onRemove }: { r: Range; onChange: (r: Range) => void; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TimeField label="From" minutes={r.start} onChange={(m) => onChange({ ...r, start: m })} />
      <T color={colors.textMuted}>to</T>
      <TimeField label="Until" minutes={r.end} onChange={(m) => onChange({ ...r, end: m })} />
      <IconButton label="Remove time range" icon={<Trash2 size={18} color={colors.danger} />} onPress={onRemove} />
    </View>
  );
}

export function StepAvailability() {
  const q = useQuery({ queryKey: ['availability'], queryFn: () => api.availability.mine() });
  const [days, setDays] = useState<Record<number, Range[]>>({});
  const [appt, setAppt] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (q.data && !loaded) {
      const d: Record<number, Range[]> = {};
      q.data.rules.forEach((r) => { (d[r.weekday] ??= []).push({ start: r.startMinute, end: r.endMinute }); });
      setDays(d); setAppt(q.data.appointmentOnly); setLoaded(true);
    }
  }, [q.data, loaded]);

  useRegisterSave(async () => {
    const rules = Object.entries(days).flatMap(([wd, rs]) => rs.map((r) => ({ weekday: Number(wd), startMinute: r.start, endMinute: r.end })));
    if (rules.some((r) => r.endMinute <= r.startMinute)) { Alert.alert('Check your hours', 'Each range must end after it starts.'); return false; }
    try { await api.availability.set({ timezone: q.data?.timezone ?? 'Asia/Kolkata', appointmentOnly: appt, rules }); return true; } catch (e) { Alert.alert('Could not save hours', errorMessage(e)); return false; }
  });

  if (q.isPending) return <ActivityIndicator color={colors.teal700} />;
  const toggle = (d: number) => setDays((x) => ({ ...x, [d]: x[d]?.length ? [] : [{ start: 9 * 60, end: 18 * 60 }] }));
  return (
    <View style={{ gap: 12 }}>
      <T color={colors.textMuted}>Add more than one range in a day to leave a break, for example 9 AM to 1 PM and 2 PM to 7 PM.</T>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
        const rs = days[d] ?? [];
        return (
          <Card key={d} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T v="heading" color={colors.text}>{WEEKDAYS[d]}</T>
              <Switch accessibilityLabel={`${WEEKDAYS[d]} open`} value={rs.length > 0} onValueChange={() => toggle(d)} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
            </View>
            {rs.map((r, i) => <RangeRow key={i} r={r} onChange={(n) => setDays((x) => ({ ...x, [d]: rs.map((y, j) => (j === i ? n : y)) }))} onRemove={() => setDays((x) => ({ ...x, [d]: rs.filter((_, j) => j !== i) }))} />)}
            {rs.length > 0 ? <Button kind="ghost" size="sm" title="Add another range" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={() => setDays((x) => ({ ...x, [d]: [...rs, { start: Math.min(1380, (rs[rs.length - 1]?.end ?? 600) + 60), end: Math.min(1440, (rs[rs.length - 1]?.end ?? 600) + 180) }] }))} /> : <T v="caption">Closed</T>}
          </Card>
        );
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}><T>By appointment only</T><T v="caption">Shows {'"'}by appointment{'"'} instead of working hours</T></View>
        <Switch accessibilityLabel="Appointment only" value={appt} onValueChange={setAppt} trackColor={{ true: colors.teal700, false: colors.borderStrong }} thumbColor="#fff" />
      </View>
    </View>
  );
}

export function StepPortfolio() {
  const { provider, refresh } = useStep();
  const [busy, setBusy] = useState(false);
  const add = async () => {
    try {
      const files = await pickImage({ multiple: true });
      if (!files.length) return;
      setBusy(true);
      for (const f of files) { const url = await uploadImage(f, 'PORTFOLIO'); await api.providers.addPortfolio({ kind: 'IMAGE', url }); }
      await refresh();
    } catch (e) { Alert.alert('Upload', errorMessage(e)); } finally { setBusy(false); }
  };
  const items = provider?.portfolio ?? [];
  useRegisterSave(async () => true);
  return (
    <View style={{ gap: 16 }}>
      <T color={colors.textMuted}>Photos of your past work build trust. You can add more later.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((it) => (
          <View key={it.id} style={{ width: '31.5%', aspectRatio: 1 }}>
            <Image cachePolicy="memory-disk" contentFit="cover" transition={120} source={{ uri: it.url }} style={{ flex: 1, borderRadius: 12 }} accessibilityLabel={it.title ?? 'Portfolio photo'} />
            <Pressable onPress={() => api.providers.deletePortfolio(it.id).then(refresh).catch((e) => Alert.alert('Could not remove', errorMessage(e)))} accessibilityRole="button" accessibilityLabel="Remove photo" style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} color="#fff" /></Pressable>
          </View>
        ))}
      </View>
      <Button kind="secondary" title={busy ? 'Uploading…' : 'Add photos'} loading={busy} icon={<ImagePlus size={18} color={colors.navy} />} onPress={add} />
    </View>
  );
}

export function StepVerification() {
  const { provider, refresh } = useStep();
  const [busy, setBusy] = useState<string | null>(null);
  const v = provider?.verification;
  const submit = async (type: 'IDENTITY' | 'QUALIFICATION') => {
    try {
      const [f] = await pickImage();
      if (!f) return;
      setBusy(type);
      const documentUrl = await uploadImage(f, 'VERIFICATION');
      await api.providers.submitVerification({ type, documentUrl });
      await refresh();
    } catch (e) { Alert.alert('Verification', errorMessage(e)); } finally { setBusy(null); }
  };
  useRegisterSave(async () => true);
  const status = (s?: string) => (s === 'APPROVED' ? 'Verified' : s === 'PENDING' ? 'Under review' : s === 'REJECTED' ? 'Rejected, upload again' : 'Not submitted');
  return (
    <View style={{ gap: 12 }}>
      <T color={colors.textMuted}>Verified profiles get more chats. Documents are reviewed privately and never shown to customers. You can skip this and do it later.</T>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ShieldCheck size={20} color={colors.teal} /><T v="heading" color={colors.text}>Identity</T></View>
        <T v="caption">Aadhaar, PAN, driving licence or passport {'·'} {status(v?.identity)}</T>
        {v?.identity !== 'APPROVED' && v?.identity !== 'PENDING' ? <Button kind="secondary" size="sm" title="Upload ID document" loading={busy === 'IDENTITY'} onPress={() => submit('IDENTITY')} /> : null}
      </Card>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Award size={20} color={colors.navy} /><T v="heading" color={colors.text}>Qualification</T></View>
        <T v="caption">Certificate or licence {'·'} {status(v?.qualification)}</T>
        {v?.qualification !== 'APPROVED' && v?.qualification !== 'PENDING' ? <Button kind="secondary" size="sm" title="Upload certificate" loading={busy === 'QUALIFICATION'} onPress={() => submit('QUALIFICATION')} /> : null}
      </Card>
    </View>
  );
}

export function StepPlan({ onDone, onLater }: { onDone: () => void; onLater?: () => void }) {
  const { provider, refresh } = useStep();
  const { me } = useSession();
  const preview = useQuery({ queryKey: ['preview'], queryFn: () => api.providers.preview(), enabled: !!provider });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.subscriptions.plans() });
  const [planId, setPlanId] = useState<string | undefined>();
  const [stage, setStage] = useState<'idle' | 'paying' | 'verifying' | 'waiting' | 'active' | 'timeout'>('idle');
  const [err, setErr] = useState<string | null>(null);
  useRegisterSave(async () => true);
  const chosen: SubscriptionPlanDto | undefined = plans.data?.find((p) => p.id === planId) ?? plans.data?.[0];
  const missing = provider?.missingForPublish ?? [];

  const pay = async () => {
    if (!chosen) return;
    setErr(null);
    try {
      if (missing.length) throw new Error(`Complete these first: ${missing.join(', ')}`);
      setStage('paying');
      if (provider?.status === 'DRAFT') await api.providers.publish();
      const co = await api.subscriptions.checkout(chosen.id);
      const res = await openRazorpaySubscription({ keyId: co.razorpayKeyId, subscriptionId: co.razorpaySubscriptionId, name: 'help', description: `${chosen.name} plan`, prefill: { contact: me?.phone ?? undefined, email: me?.email ?? undefined, name: me?.name ?? undefined } });
      setStage('verifying');
      await api.subscriptions.verify(res);
      setStage('waiting');
      for (let i = 0; i < 20; i++) {
        const s = await api.subscriptions.mine();
        if (s?.status === 'ACTIVE') { setStage('active'); await refresh(); askPushPermission(); return; }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setStage('timeout');
    } catch (e) { setErr(errorMessage(e)); setStage('idle'); }
  };

  const p = preview.data;
  return (
    <View style={{ gap: 20 }}>
      {p ? (
        <Card style={{ gap: 6 }}>
          <T v="overline">How customers will see you</T>
          <T v="heading" color={colors.text}>{p.displayName}</T>
          <T color={colors.textMuted}>{p.headline}</T>
          <T v="caption">{p.categoryName} {'·'} {p.experienceYears} yrs {'·'} {p.services.length} service{p.services.length === 1 ? '' : 's'}</T>
        </Card>
      ) : null}
      {missing.length ? <Card style={{ borderColor: colors.warning, gap: 4 }}><T v="label" weight={600}>Still missing</T>{missing.map((m) => <T key={m} v="caption">{'•'} {m}</T>)}</Card> : null}
      <View style={{ gap: 10 }}>
        <T v="heading">Choose your plan</T>
        {(plans.data ?? []).map((pl) => {
          const on = (chosen?.id ?? '') === pl.id;
          return (
            <Pressable key={pl.id} onPress={() => setPlanId(pl.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.teal700 : colors.border, backgroundColor: on ? colors.tealTint : colors.white, padding: on ? 15 : 16, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="heading" color={colors.text}>{pl.name}</T><T v="heading">{formatINR(pl.pricePaise)}<T v="caption"> / {pl.interval === 'MONTHLY' ? 'month' : 'year'}</T></T></View>
              {pl.features.map((f) => <T key={f} v="caption">{'•'} {f}</T>)}
            </Pressable>
          );
        })}
      </View>
      <T v="caption" style={{ fontSize: 12 }}>Your profile goes live only after the payment is confirmed by our server. This usually takes a few seconds after you pay.</T>
      {err ? <T v="caption" color={colors.danger}>{err}</T> : null}
      {stage === 'waiting' || stage === 'verifying' ? <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><ActivityIndicator color={colors.teal700} /><T style={{ flex: 1 }}>Payment received. Waiting for the server to confirm your subscription{'…'}</T></View> : null}
      {stage === 'timeout' ? <T color={colors.warningFg}>Still confirming. You will get a notification as soon as your plan is active; you can leave this screen.</T> : null}
      {stage === 'active' ? <View style={{ gap: 12 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><CheckCircle2 size={22} color={colors.success} /><T v="heading" color={colors.success}>You are live</T></View><Button title="Go to dashboard" onPress={onDone} /></View> : (
        <Button size="lg" title={chosen ? `Pay ${formatINR(chosen.pricePaise)} and go live` : 'Choose a plan'} loading={stage === 'paying' || stage === 'verifying' || stage === 'waiting'} disabled={!chosen} onPress={pay} />
      )}
      {stage === 'timeout' ? <Button kind="secondary" title="Go to dashboard" onPress={onDone} /> : null}
      {stage === 'idle' && onLater ? <Button kind="ghost" title="Finish later" onPress={onLater} /> : null}
    </View>
  );
}
