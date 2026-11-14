import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LocateFixed } from 'lucide-react';
import type { MyProvider } from '@help/api-client';
import { ProviderBasicsSchema, ProviderLocationSchema } from '@help/validation';
import { errorMessage, useApi } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';
import { categoriesQuery } from '../../lib/queries';
import { CITIES } from '../../lib/cities';
import { readDraft, writeDraft, type BasicsDraft } from '../../lib/hooks';
import { Button } from '../ui/Button';
import { Chip, Input, Select, Textarea, fieldErrors } from '../ui/Field';
import { FileUpload, TagInput } from '../forms/Inputs';
import { MapPicker } from '../forms/MapPicker';

export interface StepProps { mine: MyProvider | null; done: () => void; cta?: string }
const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Malayalam', 'Gujarati'];

function useSave(done: () => void) {
  const qc = useQueryClient();
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    // Refresh the header avatar (me) and the cached provider profile after each save.
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['my-provider'] }), refreshMe().catch(() => undefined)]); done(); },
  });
}
const Err = ({ e }: { e: unknown }) => (e ? <p role="alert" className="text-sm font-medium text-danger">{errorMessage(e)}</p> : null);

export function StepBasics({ mine, done, cta = 'Save and continue' }: StepProps) {
  const api = useApi();
  const draft = mine ? null : readDraft();
  const [f, setF] = useState<BasicsDraft>({
    displayName: mine?.displayName ?? draft?.displayName ?? '', headline: mine?.headline ?? draft?.headline ?? '',
    experienceYears: mine?.experienceYears ?? draft?.experienceYears ?? 0, bio: mine?.bio ?? draft?.bio ?? '',
    languages: mine?.languages ?? draft?.languages ?? [], avatarUrl: mine?.avatarUrl ?? draft?.avatarUrl ?? undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSave(done);
  const submit = () => {
    const errs = fieldErrors(ProviderBasicsSchema.omit({ primaryCategoryId: true }), { ...f, bio: f.bio || undefined });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!mine) { writeDraft(f); done(); return; } // provider is created in the next step together with the profession
    save.mutate(() => api.providers.updateBasics({ ...f, bio: f.bio || undefined }));
  };
  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <FileUpload purpose="AVATAR" label="Upload profile photo" avatarName={f.displayName} current={f.avatarUrl} onUploaded={(url) => setF((o) => ({ ...o, avatarUrl: url }))} />
      <Input label="Display name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} error={errors.displayName} maxLength={80} />
      <Input label="Headline" hint="e.g. Licensed electrician" value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} error={errors.headline} maxLength={100} />
      <Input label="Years of experience" type="number" min={0} max={70} value={f.experienceYears} onChange={(e) => setF({ ...f, experienceYears: Math.max(0, Math.round(Number(e.target.value) || 0)) })} error={errors.experienceYears} />
      <Textarea label="About you" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} error={errors.bio} maxLength={2000} />
      <fieldset><legend className="mb-2 text-sm font-medium text-navy">Languages you speak</legend>
        <div className="flex flex-wrap gap-2">{LANGS.map((l) => <Chip key={l} active={f.languages.includes(l)} onClick={() => setF({ ...f, languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l] })}>{l}</Chip>)}</div></fieldset>
      <Err e={save.error} />
      <div><Button type="submit" size="lg" loading={save.isPending}>{cta}</Button></div>
    </form>
  );
}

export function StepProfession({ mine, done, cta = 'Save and continue' }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery(api));
  const draft = readDraft();
  const [categoryId, setCategoryId] = useState(mine?.primaryCategoryId ?? '');
  const [skills, setSkills] = useState<string[]>(mine?.skills ?? []);
  const [quals, setQuals] = useState<string[]>(mine?.qualifications ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => {
      if (mine) { await api.providers.updateBasics({ primaryCategoryId: categoryId, qualifications: quals }); return api.providers.setSkills(skills); }
      if (!draft) throw new Error('Please complete the Basics step first.');
      await api.providers.create(ProviderBasicsSchema.parse({ ...draft, bio: draft.bio || undefined, primaryCategoryId: categoryId, qualifications: quals }));
      writeDraft(null);
      return api.providers.setSkills(skills);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['my-provider'] }); await qc.invalidateQueries({ queryKey: ['me'] }); done(); },
  });
  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); if (!categoryId) { setErrors({ category: 'Choose your profession' }); return; } setErrors({}); m.mutate(); }}>
      <Select label="Profession" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category}>
        <option value="">Select a category</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <TagInput label="Skills" values={skills} onChange={setSkills} placeholder="e.g. Wiring" max={30} hint="Press Enter to add. Up to 30." />
      <TagInput label="Qualifications and certificates" values={quals} onChange={setQuals} placeholder="e.g. ITI Electrician" max={20} />
      <Err e={m.error} />
      <div><Button type="submit" size="lg" loading={m.isPending}>{cta}</Button></div>
    </form>
  );
}

export function StepLocation({ mine, done, cta = 'Save and continue' }: StepProps) {
  const api = useApi();
  const [f, setF] = useState({
    city: mine?.city ?? '', pinCode: mine?.pinCode ?? '', locality: mine?.locality ?? '', lat: mine?.lat ?? 0, lng: mine?.lng ?? 0,
    serviceRadiusKm: mine?.serviceRadiusKm ?? 8, serviceMode: mine?.serviceMode ?? ('ONSITE' as const), areasServed: mine?.areasServed ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const save = useSave(done);
  const pickCity = (name: string) => { const c = CITIES.find((x) => x.name === name); setF((o) => ({ ...o, city: name, ...(c && !o.lat ? { lat: c.lat, lng: c.lng } : {}) })); };
  // Reverse-geocode coordinates and fill blank address fields (free OpenStreetMap).
  const autofill = async (lat: number, lng: number) => {
    setFilling(true);
    try {
      const a = await api.discovery.reverseGeocode({ lat, lng });
      setF((o) => ({
        ...o,
        city: o.city || (a.city && CITIES.some((c) => c.name === a.city) ? a.city! : o.city) || a.city || '',
        pinCode: o.pinCode || a.pinCode || '',
        locality: o.locality || a.locality || '',
      }));
    } catch { /* leave fields for manual entry */ } finally { setFilling(false); }
  };
  const setPoint = (lat: number, lng: number, fill = true) => {
    const rl = +lat.toFixed(5), rg = +lng.toFixed(5);
    setF((o) => ({ ...o, lat: rl, lng: rg }));
    if (fill) void autofill(rl, rg);
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => { setGeoErr(null); setPoint(p.coords.latitude, p.coords.longitude); },
    () => setGeoErr('Could not read your location. Pick it on the map or enter coordinates.'),
  );
  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={(e) => {
      e.preventDefault();
      const body = { ...f, locality: f.locality || undefined };
      const errs = fieldErrors(ProviderLocationSchema, body); setErrors(errs);
      if (!Object.keys(errs).length) save.mutate(() => api.providers.setLocation(ProviderLocationSchema.parse(body)));
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="City" value={f.city} onChange={(e) => pickCity(e.target.value)} error={errors.city}><option value="">Select city</option>{CITIES.map((c) => <option key={c.slug}>{c.name}</option>)}{f.city && !CITIES.some((c) => c.name === f.city) && <option>{f.city}</option>}</Select>
        <Input label="PIN code" inputMode="numeric" maxLength={6} value={f.pinCode} onChange={(e) => setF({ ...f, pinCode: e.target.value.replace(/\D/g, '') })} error={errors.pinCode} />
      </div>
      <Input label="Locality" value={f.locality} onChange={(e) => setF({ ...f, locality: e.target.value })} hint="Shown publicly. Your exact address is never shown." />
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-navy">Base location{filling && <span className="ml-2 text-xs font-normal text-subtle">filling address…</span>}</span><Button variant="ghost" size="sm" icon={<LocateFixed className="h-4 w-4" />} onClick={locate}>Use my location</Button></div>
        <MapPicker value={{ lat: f.lat, lng: f.lng }} radiusKm={f.serviceRadiusKm} onChange={(p) => setPoint(p.lat, p.lng)} />
        <p className="mt-1 text-xs text-subtle">Drag the pin to your base. We fill in the city and area for you; your exact point is never shown publicly.</p>
        <div className="mt-3 grid grid-cols-2 gap-4"><Input label="Latitude" type="number" step="any" value={f.lat} onChange={(e) => setPoint(Number(e.target.value), f.lng, false)} error={errors.lat} /><Input label="Longitude" type="number" step="any" value={f.lng} onChange={(e) => setPoint(f.lat, Number(e.target.value), false)} error={errors.lng} /></div>
        {geoErr && <p role="alert" className="mt-1 text-xs text-danger">{geoErr}</p>}
      </div>
      <div>
        <label htmlFor="radius" className="mb-1 flex justify-between text-sm font-medium text-navy"><span>Service radius</span><span>{f.serviceRadiusKm} km</span></label>
        <input id="radius" type="range" min={1} max={50} value={f.serviceRadiusKm} onChange={(e) => setF({ ...f, serviceRadiusKm: Number(e.target.value) })} className="w-full accent-teal-700" />
      </div>
      <Select label="How do you work?" value={f.serviceMode} onChange={(e) => setF({ ...f, serviceMode: e.target.value as typeof f.serviceMode })}>
        <option value="ONSITE">At the customer location</option><option value="REMOTE">Online</option><option value="BOTH">Both</option>
      </Select>
      <TagInput label="Areas served" values={f.areasServed} onChange={(v) => setF({ ...f, areasServed: v })} placeholder="e.g. Koramangala" max={30} />
      <Err e={save.error} />
      <div><Button type="submit" size="lg" loading={save.isPending}>{cta}</Button></div>
    </form>
  );
}
