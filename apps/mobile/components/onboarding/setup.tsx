import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Camera, Check, ChevronDown, ChevronRight, Crosshair, Plus, Search, X } from 'lucide-react-native';
import { ProviderBasicsSchema, ProviderLocationSchema } from '@help/validation';
import type { Category } from '@help/types';
import Map from '@/components/Map';
import { CatIcon } from '@/components/CategoryIcon';
import { Avatar, Button, Chip, Input, Press, Segmented, Sheet, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useCategories } from '@/lib/hooks';
import { useLocation } from '@/lib/location';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import { useRegisterSave, useStep } from './ctx';

const EXPERIENCE: [string, number][] = [['Just starting', 0], ['1–2 years', 2], ['3–5 years', 4], ['6–10 years', 8], ['10+ years', 12]];
const nearestExp = (n: number) => EXPERIENCE.reduce((b, e) => (Math.abs(e[1] - n) < Math.abs(b[1] - n) ? e : b), EXPERIENCE[0]!)[1];

/** Searchable picker over every service in the catalog. */
function ServicePicker({ visible, onClose, onPick, selectedId }: { visible: boolean; onClose: () => void; onPick: (c: Category) => void; selectedId?: string }) {
  const cats = useCategories();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const all = cats.data ?? [];
  const groups = all.filter((c) => !c.parentId);
  const t = term.trim().toLowerCase();
  const hits = useMemo(() => (t.length < 2 ? [] : all.filter((c) => c.parentId && (c.name.toLowerCase().includes(t) || c.keywords?.some((k) => k.toLowerCase().includes(t)))).slice(0, 40)), [all, t]);
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? '';
  const row = (c: Category, sub?: string) => (
    <Pressable key={c.id} onPress={() => { onPick(c); onClose(); }} accessibilityRole="button" accessibilityLabel={c.name}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
      <View style={{ flex: 1 }}><T color={colors.text}>{c.name}</T>{sub ? <T v="caption">{sub}</T> : null}</View>
      {selectedId === c.id ? <Check size={18} color={colors.teal700} /> : null}
    </Pressable>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="What do you do?">
      <View style={{ height: 46, borderRadius: 12, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
        <Search size={18} color={colors.textMuted} />
        <TextInput autoFocus value={term} onChangeText={setTerm} placeholder="Search, e.g. plumber, tutor, makeup" placeholderTextColor={colors.textMuted} accessibilityLabel="Search services"
          style={{ flex: 1, height: 46, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text }} />
        {term ? <Pressable onPress={() => setTerm('')} hitSlop={8} accessibilityLabel="Clear"><X size={18} color={colors.textMuted} /></Pressable> : null}
      </View>
      {t.length >= 2 ? (
        hits.length ? <View>{hits.map((c) => row(c, groupName(c.parentId)))}</View> : <T color={colors.textMuted}>No match. Try a simpler word, like “repair” or “teacher”.</T>
      ) : (
        <View>
          {groups.map((g) => (
            <View key={g.id}>
              <Pressable onPress={() => setOpen(open === g.id ? null : g.id)} accessibilityRole="button" accessibilityState={{ expanded: open === g.id }}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <CatIcon name={g.icon} size={20} color={colors.teal800} />
                <T style={{ flex: 1 }} weight={500} color={colors.text}>{g.name}</T>
                {open === g.id ? <ChevronDown size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
              </Pressable>
              {open === g.id ? <View style={{ paddingLeft: 32 }}>{all.filter((c) => c.parentId === g.id).map((c) => row(c))}</View> : null}
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

/** Step 1: photo, name, profession and experience. Creates the profile. */
export function StepYou() {
  const { draft, patchDraft, provider, refresh } = useStep();
  const cats = useCategories();
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const service = cats.data?.find((c) => c.id === draft.primaryCategoryId);

  const photo = async () => {
    try {
      const [f] = await pickImage({ aspect: [1, 1] });
      if (!f) return;
      setBusy(true);
      patchDraft({ avatarUrl: await uploadImage(f, 'AVATAR') });
    } catch (e) { Alert.alert('Photo', errorMessage(e)); } finally { setBusy(false); }
  };

  useRegisterSave(async () => {
    const e: Record<string, string> = {};
    if (draft.displayName.trim().length < 2) e.displayName = 'Enter your name or business name';
    if (!draft.primaryCategoryId) e.service = 'Choose what you do';
    setErrs(e);
    if (Object.keys(e).length) return false;
    const headline = draft.headline.trim().length >= 3 ? draft.headline.trim() : `${service?.name ?? 'Professional'}${draft.experienceYears ? ` · ${draft.experienceYears}+ years` : ''}`;
    const body = { displayName: draft.displayName.trim(), headline, primaryCategoryId: draft.primaryCategoryId!, experienceYears: draft.experienceYears, bio: draft.bio.trim() || undefined, languages: draft.languages, qualifications: draft.qualifications, avatarUrl: draft.avatarUrl };
    const r = ProviderBasicsSchema.safeParse(body);
    if (!r.success) { Alert.alert('Check your details', r.error.issues[0]?.message ?? 'Invalid details'); return false; }
    try {
      if (provider) await api.providers.updateBasics(r.data); else await api.providers.create(r.data);
      patchDraft({ headline });
      await refresh();
      return true;
    } catch (x) { Alert.alert('Could not save', errorMessage(x)); return false; }
  });

  return (
    <View style={{ gap: 22 }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Press onPress={photo} accessibilityRole="button" accessibilityLabel={draft.avatarUrl ? 'Change photo' : 'Add a photo'} scaleTo={0.96}>
          <Avatar name={draft.displayName || '?'} url={draft.avatarUrl} size={96} rounded />
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={16} color="#fff" />
          </View>
        </Press>
        <T v="caption" align="center">{busy ? 'Uploading…' : 'A clear photo of your face gets more customers'}</T>
      </View>
      <Input label="Your name or business name" value={draft.displayName} onChangeText={(t) => patchDraft({ displayName: t })} error={errs.displayName} autoComplete="name" />
      <View style={{ gap: 6 }}>
        <T v="label" weight={500} color={colors.textSubtle}>What do you do?</T>
        <Press onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={service ? `Profession: ${service.name}. Change` : 'Choose your profession'} scaleTo={0.99}
          style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: errs.service ? colors.danger : colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
          <T style={{ flex: 1 }} color={service ? colors.text : colors.textMuted}>{service?.name ?? 'Choose from 450+ services'}</T>
          <ChevronDown size={18} color={colors.textMuted} />
        </Press>
        {errs.service ? <T v="caption" color={colors.danger}>{errs.service}</T> : null}
      </View>
      <View style={{ gap: 8 }}>
        <T v="label" weight={500} color={colors.textSubtle}>Experience</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EXPERIENCE.map(([l, n]) => <Chip key={l} label={l} selected={nearestExp(draft.experienceYears) === n && (draft.experienceYears > 0 || n === 0)} onPress={() => patchDraft({ experienceYears: n })} />)}
        </View>
      </View>
      <ServicePicker visible={picker} onClose={() => setPicker(false)} selectedId={draft.primaryCategoryId} onPick={(c) => patchDraft({ primaryCategoryId: c.id })} />
    </View>
  );
}

const HOURS: { key: string; label: string; days: number[]; start: number; end: number }[] = [
  { key: 'weekdays', label: 'Mon–Sat, 9 AM–7 PM', days: [1, 2, 3, 4, 5, 6], start: 540, end: 1140 },
  { key: 'everyday', label: 'Every day, 8 AM–8 PM', days: [0, 1, 2, 3, 4, 5, 6], start: 480, end: 1200 },
  { key: 'weekends', label: 'Weekends, 9 AM–6 PM', days: [0, 6], start: 540, end: 1080 },
];
const RADII = [3, 5, 10, 25];

/** Step 2: base location (from GPS or a map pin), visiting radius and working days. */
export function StepWhere() {
  const { provider, refresh } = useStep();
  const loc = useLocation();
  const [pt, setPt] = useState({ lat: provider?.lat ?? loc.coords.lat, lng: provider?.lng ?? loc.coords.lng });
  const [city, setCity] = useState(provider?.city ?? loc.place?.city ?? '');
  const [pin, setPin] = useState(provider?.pinCode ?? loc.place?.pin ?? '');
  const [locality, setLocality] = useState(provider?.locality ?? '');
  const [radius, setRadius] = useState(provider?.serviceRadiusKm ?? 5);
  const [mode, setMode] = useState<'ONSITE' | 'REMOTE' | 'BOTH'>(provider?.serviceMode ?? 'ONSITE');
  const [hours, setHours] = useState<string>(provider?.missingForPublish?.includes('availability') === false ? 'keep' : 'weekdays');
  const [locating, setLocating] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const fill = async (p: { lat: number; lng: number }) => {
    setPt(p);
    try {
      const g = await api.discovery.reverseGeocode(p);
      if (g.city) setCity(g.city);
      if (g.pinCode) setPin(g.pinCode);
      if (g.locality) setLocality(g.locality);
    } catch { /* keep what the user typed */ }
  };
  const here = async () => {
    setLocating(true);
    try { const p = await loc.useCurrentLocation(); await fill({ lat: p.lat, lng: p.lng }); } catch (e) { Alert.alert('Location', errorMessage(e)); } finally { setLocating(false); }
  };

  useRegisterSave(async () => {
    const r = ProviderLocationSchema.safeParse({ city: city.trim(), pinCode: pin, locality: locality.trim() || undefined, lat: pt.lat, lng: pt.lng, serviceRadiusKm: radius, serviceMode: mode, areasServed: [] });
    if (!r.success) {
      setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.path[0] === 'pinCode' ? 'Enter a 6-digit PIN code' : i.message])));
      return false;
    }
    setErrs({});
    try {
      await api.providers.setLocation(r.data);
      const h = HOURS.find((x) => x.key === hours);
      if (h) await api.availability.set({ timezone: 'Asia/Kolkata', appointmentOnly: false, rules: h.days.map((d) => ({ weekday: d, startMinute: h.start, endMinute: h.end })) });
      await refresh();
      return true;
    } catch (e) { Alert.alert('Could not save', errorMessage(e)); return false; }
  });

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Button title={locating ? 'Finding you…' : 'Use my current location'} loading={locating} icon={<Crosshair size={18} color="#fff" />} onPress={here} />
        <View style={{ height: 190, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <Map style={{ flex: 1 }} center={pt} zoom={14} pickable onPick={fill} />
        </View>
        <T v="caption">Tap the map or drag the pin to your base. Customers only see your area, never your exact address.</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Input label="Area" value={locality} onChangeText={setLocality} placeholder="e.g. Indiranagar" /></View>
        <View style={{ width: 120 }}><Input label="PIN code" keyboardType="number-pad" maxLength={6} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} error={errs.pinCode} /></View>
      </View>
      <Input label="City" value={city} onChangeText={setCity} error={errs.city} />
      <View style={{ gap: 8 }}>
        <T v="label" weight={500} color={colors.textSubtle}>How do you work?</T>
        <Segmented value={mode} onChange={setMode} options={[{ key: 'ONSITE', label: 'I visit' }, { key: 'REMOTE', label: 'Online' }, { key: 'BOTH', label: 'Both' }]} />
      </View>
      {mode !== 'REMOTE' ? (
        <View style={{ gap: 8 }}>
          <T v="label" weight={500} color={colors.textSubtle}>How far will you travel?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{RADII.map((r) => <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />)}</View>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <T v="label" weight={500} color={colors.textSubtle}>When do you usually work?</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {hours === 'keep' ? <Chip label="Keep my current hours" selected /> : null}
          {HOURS.map((h) => <Chip key={h.key} label={h.label} selected={hours === h.key} onPress={() => setHours(h.key)} />)}
        </View>
        <T v="caption">You can set exact hours and breaks later from your profile.</T>
      </View>
    </View>
  );
}

/** Edit-only: intro, skills, qualifications and languages. */
const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Malayalam', 'Gujarati'];
export function StepAbout() {
  const { draft, patchDraft, provider, refresh } = useStep();
  const [skill, setSkill] = useState('');
  const [qual, setQual] = useState('');
  const addSkill = () => { const s = skill.trim(); if (s.length >= 2 && !draft.skills.includes(s)) patchDraft({ skills: [...draft.skills, s] }); setSkill(''); };
  const addQual = () => { const s = qual.trim(); if (s && !draft.qualifications.includes(s)) patchDraft({ qualifications: [...draft.qualifications, s] }); setQual(''); };
  useRegisterSave(async () => {
    if (!provider?.primaryCategoryId) return true;
    try {
      await api.providers.updateBasics({ displayName: draft.displayName.trim(), headline: draft.headline.trim(), primaryCategoryId: provider.primaryCategoryId, experienceYears: draft.experienceYears, bio: draft.bio.trim() || undefined, languages: draft.languages, qualifications: draft.qualifications, avatarUrl: draft.avatarUrl });
      await api.providers.setSkills(draft.skills);
      await refresh();
      return true;
    } catch (e) { Alert.alert('Could not save', errorMessage(e)); return false; }
  });
  return (
    <View style={{ gap: 20 }}>
      <Input label="Headline" value={draft.headline} onChangeText={(t) => patchDraft({ headline: t })} maxLength={100} hint="Shown under your name in search" />
      <Input label="Introduce yourself" multiline value={draft.bio} onChangeText={(t) => patchDraft({ bio: t })} maxLength={2000} placeholder="What you do, how you work, what customers can expect" />
      <View style={{ gap: 8 }}>
        <Input label="Skills" value={skill} onChangeText={setSkill} onSubmitEditing={addSkill} returnKeyType="done" placeholder="e.g. Inverter wiring" left={<Pressable onPress={addSkill} accessibilityLabel="Add skill" hitSlop={8}><Plus size={18} color={colors.teal700} /></Pressable>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{draft.skills.map((s) => <Chip key={s} selected label={s} icon={<X size={12} color="#fff" />} onPress={() => patchDraft({ skills: draft.skills.filter((x) => x !== s) })} />)}</View>
      </View>
      <View style={{ gap: 8 }}>
        <Input label="Qualifications and certificates" value={qual} onChangeText={setQual} onSubmitEditing={addQual} returnKeyType="done" placeholder="e.g. ITI electrician" left={<Pressable onPress={addQual} accessibilityLabel="Add qualification" hitSlop={8}><Plus size={18} color={colors.teal700} /></Pressable>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{draft.qualifications.map((s) => <Chip key={s} selected label={s} icon={<X size={12} color="#fff" />} onPress={() => patchDraft({ qualifications: draft.qualifications.filter((x) => x !== s) })} />)}</View>
      </View>
      <View style={{ gap: 10 }}>
        <T v="label" weight={500} color={colors.textSubtle}>Languages you speak</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{LANGS.map((l) => <Chip key={l} label={l} selected={draft.languages.includes(l)} onPress={() => patchDraft({ languages: draft.languages.includes(l) ? draft.languages.filter((x) => x !== l) : [...draft.languages, l] })} />)}</View>
      </View>
    </View>
  );
}

/** Suggested services from the professional's own field, one tap to prefill the add form. */
export function ServiceSuggestions({ onPick, taken }: { onPick: (title: string) => void; taken: string[] }) {
  const { provider } = useStep();
  const cats = useCategories();
  const mine = cats.data?.find((c) => c.id === provider?.primaryCategoryId);
  const siblings = (cats.data ?? []).filter((c) => c.parentId && c.parentId === mine?.parentId && (c.subgroup === mine?.subgroup || !mine?.subgroup)).map((c) => c.name);
  const list = [...new Set([mine?.name, ...siblings].filter((x): x is string => !!x))].filter((n) => !taken.some((t) => t.toLowerCase() === n.toLowerCase())).slice(0, 8);
  if (!list.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <T v="label" weight={500} color={colors.textSubtle}>Quick add</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {list.map((n) => <Chip key={n} label={n} icon={<Plus size={14} color={colors.teal700} />} onPress={() => onPick(n)} />)}
      </ScrollView>
    </View>
  );
}
