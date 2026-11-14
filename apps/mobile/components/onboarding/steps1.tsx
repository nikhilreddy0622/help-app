import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Map from '@/components/Map';
import { Crosshair, Plus, X } from 'lucide-react-native';
import { ProviderBasicsSchema, ProviderLocationSchema } from '@help/validation';
import { Slider } from '@/components/Slider';
import { Avatar, Button, Chip, Input, Segmented, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useCategories } from '@/lib/hooks';
import { useLocation } from '@/lib/location';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import { useRegisterSave, useStep } from './ctx';

const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Malayalam', 'Gujarati'];

export function StepBasics() {
  const { draft, patchDraft, provider, refresh } = useStep();
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

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
    if (draft.headline.trim().length < 3) e.headline = 'Add a short headline, e.g. Licensed electrician';
    setErrs(e);
    if (Object.keys(e).length) return false;
    if (provider) {
      try { await api.providers.updateBasics({ displayName: draft.displayName.trim(), headline: draft.headline.trim(), avatarUrl: draft.avatarUrl }); await refresh(); } catch (x) { Alert.alert('Could not save', errorMessage(x)); return false; }
    }
    return true;
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={draft.displayName} url={draft.avatarUrl} size={88} />
        <Button kind="ghost" size="sm" title={busy ? 'Uploading…' : 'Add a clear face photo'} onPress={photo} />
      </View>
      <Input label="Name or business name" value={draft.displayName} onChangeText={(t) => patchDraft({ displayName: t })} error={errs.displayName} />
      <Input label="Headline" value={draft.headline} onChangeText={(t) => patchDraft({ headline: t })} error={errs.headline} maxLength={100} hint="Shown under your name in search" />
    </View>
  );
}

export function StepProfession() {
  const { draft, patchDraft, provider, refresh } = useStep();
  const cats = useCategories();
  const [skill, setSkill] = useState('');
  const [qual, setQual] = useState('');
  const addSkill = () => { const s = skill.trim(); if (s.length >= 2 && !draft.skills.includes(s)) patchDraft({ skills: [...draft.skills, s] }); setSkill(''); };
  const addQual = () => { const s = qual.trim(); if (s && !draft.qualifications.includes(s)) patchDraft({ qualifications: [...draft.qualifications, s] }); setQual(''); };

  useRegisterSave(async () => {
    if (!draft.primaryCategoryId) { Alert.alert('Choose your profession'); return false; }
    const body = {
      displayName: draft.displayName.trim(), headline: draft.headline.trim(), primaryCategoryId: draft.primaryCategoryId,
      experienceYears: draft.experienceYears, bio: draft.bio.trim() || undefined, languages: draft.languages,
      qualifications: draft.qualifications, avatarUrl: draft.avatarUrl,
    };
    const r = ProviderBasicsSchema.safeParse(body);
    if (!r.success) { Alert.alert('Check your details', r.error.issues[0]?.message ?? 'Invalid details'); return false; }
    try {
      if (provider) await api.providers.updateBasics(r.data); else await api.providers.create(r.data);
      await api.providers.setSkills(draft.skills);
      await refresh();
      return true;
    } catch (e) { Alert.alert('Could not save', errorMessage(e)); return false; }
  });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <T v="overline">Profession</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(cats.data ?? []).map((c) => <Chip key={c.id} label={c.name} selected={draft.primaryCategoryId === c.id} onPress={() => patchDraft({ primaryCategoryId: c.id })} />)}
          {cats.isPending ? <T color={colors.textMuted}>Loading professions{'…'}</T> : null}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <T v="label" weight={600}>Years of experience</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Button kind="secondary" size="sm" title="−" accessibilityLabel="Decrease experience" onPress={() => patchDraft({ experienceYears: Math.max(0, draft.experienceYears - 1) })} />
          <T v="title" style={{ minWidth: 40, textAlign: 'center' }}>{draft.experienceYears}</T>
          <Button kind="secondary" size="sm" title="+" accessibilityLabel="Increase experience" onPress={() => patchDraft({ experienceYears: Math.min(70, draft.experienceYears + 1) })} />
        </View>
      </View>
      <Input label="Introduce yourself" multiline value={draft.bio} onChangeText={(t) => patchDraft({ bio: t })} maxLength={2000} placeholder="What you do, how you work, what customers can expect" />
      <View style={{ gap: 8 }}>
        <Input label="Skills" value={skill} onChangeText={setSkill} onSubmitEditing={addSkill} returnKeyType="done" placeholder="e.g. Inverter wiring" left={<Pressable onPress={addSkill} accessibilityLabel="Add skill" hitSlop={8}><Plus size={18} color={colors.teal700} /></Pressable>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{draft.skills.map((s) => <Chip key={s} selected label={s} icon={<X size={12} color={colors.teal800} />} onPress={() => patchDraft({ skills: draft.skills.filter((x) => x !== s) })} />)}</View>
      </View>
      <View style={{ gap: 8 }}>
        <Input label="Qualifications and certificates" value={qual} onChangeText={setQual} onSubmitEditing={addQual} returnKeyType="done" placeholder="e.g. ITI electrician" left={<Pressable onPress={addQual} accessibilityLabel="Add qualification" hitSlop={8}><Plus size={18} color={colors.teal700} /></Pressable>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{draft.qualifications.map((s) => <Chip key={s} selected label={s} icon={<X size={12} color={colors.teal800} />} onPress={() => patchDraft({ qualifications: draft.qualifications.filter((x) => x !== s) })} />)}</View>
      </View>
      <View style={{ gap: 10 }}>
        <T v="overline">Languages</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{LANGS.map((l) => <Chip key={l} label={l} selected={draft.languages.includes(l)} onPress={() => patchDraft({ languages: draft.languages.includes(l) ? draft.languages.filter((x) => x !== l) : [...draft.languages, l] })} />)}</View>
      </View>
    </View>
  );
}

export function StepLocation() {
  const { provider, refresh } = useStep();
  const loc = useLocation();
  const [city, setCity] = useState(provider?.city ?? loc.place?.city ?? '');
  const [pin, setPin] = useState(provider?.pinCode ?? loc.place?.pin ?? '');
  const [locality, setLocality] = useState(provider?.locality ?? '');
  const [radius, setRadius] = useState(provider?.serviceRadiusKm ?? 8);
  const [mode, setMode] = useState<'ONSITE' | 'REMOTE' | 'BOTH'>(provider?.serviceMode ?? 'ONSITE');
  const [pt, setPt] = useState({ lat: provider?.lat ?? loc.coords.lat, lng: provider?.lng ?? loc.coords.lng });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const here = async () => { try { const p = await loc.useCurrentLocation(); setPt({ lat: p.lat, lng: p.lng }); if (p.city && !city) setCity(p.city); } catch (e) { Alert.alert('Location', errorMessage(e)); } };

  useRegisterSave(async () => {
    const r = ProviderLocationSchema.safeParse({ city: city.trim(), pinCode: pin, locality: locality.trim() || undefined, lat: pt.lat, lng: pt.lng, serviceRadiusKm: radius, serviceMode: mode, areasServed: [] });
    if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return false; }
    setErrs({});
    try { await api.providers.setLocation(r.data); await refresh(); return true; } catch (e) { Alert.alert('Could not save', errorMessage(e)); return false; }
  });

  return (
    <View style={{ gap: 20 }}>
      <Input label="PIN code" keyboardType="number-pad" maxLength={6} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} error={errs.pinCode} />
      <Input label="City" value={city} onChangeText={setCity} error={errs.city} />
      <Input label="Locality" value={locality} onChangeText={setLocality} placeholder="e.g. Indiranagar" hint="Customers see this, never your exact address" />
      <View style={{ gap: 4 }}>
        <T v="label" weight={600}>Service radius: {radius} km</T>
        <Slider label="Service radius in kilometres" value={radius} min={1} max={50} onChange={setRadius} />
      </View>
      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>How do you work?</T>
        <Segmented value={mode} onChange={setMode} options={[{ key: 'ONSITE', label: 'On-site' }, { key: 'REMOTE', label: 'Remote' }, { key: 'BOTH', label: 'Both' }]} />
      </View>
      <View style={{ gap: 8 }}>
        <T v="label" weight={600}>Pin your base on the map</T>
        <View style={{ height: 200, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <Map
            style={{ flex: 1 }}
            center={{ lat: pt.lat, lng: pt.lng }}
            zoom={14}
            pickable
            onPick={(p) => setPt({ lat: p.lat, lng: p.lng })}
          />
        </View>
        <Button kind="secondary" size="sm" title="Use my current location" icon={<Crosshair size={16} color={colors.navy} />} onPress={here} />
      </View>
    </View>
  );
}
