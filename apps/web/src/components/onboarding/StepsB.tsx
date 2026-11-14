import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ServiceOffering } from '@help/types';
import { AvailabilitySchema, ServiceOfferingSchema } from '@help/validation';
import { priceUnitLabel } from '@help/ui-tokens';
import { errorMessage, useApi } from '../../lib/api';
import { formatINR, inputToMinute, minuteToInput, WEEKDAYS, formatDateTime } from '../../lib/format';
import { Tag } from '../ui/Bits';
import { Button } from '../ui/Button';
import { Input, Select, Textarea, Toggle, fieldErrors } from '../ui/Field';
import { EmptyState, QueryBoundary, SkeletonList } from '../ui/States';
import { FileUpload } from '../forms/Inputs';
import type { StepProps } from './StepsA';

const Err = ({ e }: { e: unknown }) => (e ? <p role="alert" className="text-sm font-medium text-danger">{errorMessage(e)}</p> : null);
const UNITS = Object.keys(priceUnitLabel);
const blank = { title: '', description: '', price: '', priceUnit: 'PER_VISIT', negotiable: false, duration: '' };

export function StepServices({ mine, done, cta = 'Continue' }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-provider'] });
  const save = useMutation({
    mutationFn: (b: ReturnType<typeof ServiceOfferingSchema.parse>) => (editing ? api.providers.updateService(editing, b) : api.providers.addService(b)),
    onSuccess: async () => { setF(blank); setEditing(null); await refresh(); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.providers.deleteService(id), onSuccess: refresh });
  const submit = () => {
    const body = { title: f.title, description: f.description || undefined, priceUnit: f.priceUnit, pricePaise: Math.round(Number(f.price) * 100), negotiable: f.negotiable, durationMinutes: f.duration ? Number(f.duration) : undefined };
    const errs = fieldErrors(ServiceOfferingSchema, body); if (!f.price || Number.isNaN(Number(f.price))) errs.pricePaise = 'Enter a price in rupees';
    setErrors(errs); if (Object.keys(errs).length) return;
    save.mutate(ServiceOfferingSchema.parse(body));
  };
  const edit = (s: ServiceOffering) => { setEditing(s.id); setF({ title: s.title, description: s.description ?? '', price: String(s.pricePaise / 100), priceUnit: s.priceUnit, negotiable: s.negotiable, duration: s.durationMinutes ? String(s.durationMinutes) : '' }); };
  const services = mine?.services ?? [];
  return (
    <div className="flex flex-col gap-5">
      {services.length === 0 ? <EmptyState title="No services yet" text="Add at least one service with a price so customers know what to expect." /> : (
        <ul className="card divide-y divide-divider">{services.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="truncate font-medium">{s.title}</p><p className="text-sm text-subtle">{formatINR(s.pricePaise)} {priceUnitLabel[s.priceUnit] ?? ''}</p></div>
            <div className="flex gap-1"><Button variant="ghost" size="sm" aria-label={`Edit ${s.title}`} onClick={() => edit(s)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" aria-label={`Delete ${s.title}`} loading={del.isPending && del.variables === s.id} onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-danger" /></Button></div>
          </li>))}
        </ul>)}
      <form className="card flex flex-col gap-4 p-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h3 className="font-semibold">{editing ? 'Edit service' : 'Add a service'}</h3>
        <Input label="Service name" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={errors.title} />
        <Textarea label="Description (optional)" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Price (₹)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} error={errors.pricePaise} />
          <Select label="Charged" value={f.priceUnit} onChange={(e) => setF({ ...f, priceUnit: e.target.value })}>{UNITS.map((u) => <option key={u} value={u}>{u.replace(/_/g, ' ').toLowerCase()}</option>)}</Select>
          <Input label="Duration (min)" inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value.replace(/\D/g, '') })} error={errors.durationMinutes} />
        </div>
        <Toggle label="Price is negotiable" checked={f.negotiable} onChange={(v) => setF({ ...f, negotiable: v })} />
        <Err e={save.error ?? del.error} />
        <div className="flex gap-2"><Button type="submit" variant="secondary" loading={save.isPending} icon={<Plus className="h-4 w-4" />}>{editing ? 'Update service' : 'Add service'}</Button>{editing && <Button variant="ghost" onClick={() => { setEditing(null); setF(blank); }}>Cancel</Button>}</div>
      </form>
      <div><Button size="lg" onClick={done}>{cta}</Button></div>
    </div>
  );
}

type Rule = { weekday: number; startMinute: number; endMinute: number };
export function StepAvailability({ done, cta = 'Save and continue' }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['availability'], queryFn: () => api.availability.mine() });
  const [rules, setRules] = useState<Rule[]>([]);
  const [appt, setAppt] = useState(false);
  const [ex, setEx] = useState({ startsAt: '', endsAt: '', reason: '' });
  useEffect(() => { if (q.data) { setRules(q.data.rules); setAppt(q.data.appointmentOnly); } }, [q.data]);
  const save = useMutation({
    mutationFn: () => api.availability.set(AvailabilitySchema.parse({ timezone: q.data?.timezone ?? 'Asia/Kolkata', appointmentOnly: appt, rules })),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['availability'] }); await qc.invalidateQueries({ queryKey: ['my-provider'] }); done(); },
  });
  const addEx = useMutation({ mutationFn: () => api.availability.addException({ startsAt: new Date(ex.startsAt).toISOString(), endsAt: new Date(ex.endsAt).toISOString(), reason: ex.reason || undefined }), onSuccess: () => { setEx({ startsAt: '', endsAt: '', reason: '' }); void qc.invalidateQueries({ queryKey: ['availability'] }); } });
  const delEx = useMutation({ mutationFn: (id: string) => api.availability.deleteException(id), onSuccess: () => void qc.invalidateQueries({ queryKey: ['availability'] }) });
  const patch = (i: number, p: Partial<Rule>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const invalid = rules.some((r) => r.endMinute <= r.startMinute);
  const copyMon = () => { const mon = rules.filter((r) => r.weekday === 1); setRules((r) => [...r.filter((x) => x.weekday === 0 || x.weekday === 6 || x.weekday === 1), ...[2, 3, 4, 5].flatMap((d) => mon.map((m) => ({ ...m, weekday: d })))]); };
  return (
    <QueryBoundary query={q} skeleton={<SkeletonList rows={4} height="h-14" />}>
      {(data) => (
        <div className="flex flex-col gap-5">
          <div className="card divide-y divide-divider">
            {WEEKDAYS.map((name, d) => {
              const day = rules.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === d);
              return (
                <div key={name} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                  <p className="w-28 flex-none pt-2 text-sm font-semibold text-navy">{name}</p>
                  <div className="flex flex-1 flex-col gap-2">
                    {day.length === 0 && <p className="pt-2 text-sm text-muted">Closed</p>}
                    {day.map(({ r, i }) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input aria-label={`${name} start time`} type="time" value={minuteToInput(r.startMinute)} onChange={(e) => patch(i, { startMinute: inputToMinute(e.target.value) })} className="h-10 rounded-md border border-line-strong px-2 text-sm" />
                        <span className="text-sm text-subtle">to</span>
                        <input aria-label={`${name} end time`} type="time" value={minuteToInput(r.endMinute === 1440 ? 1439 : r.endMinute)} onChange={(e) => patch(i, { endMinute: inputToMinute(e.target.value) })} className="h-10 rounded-md border border-line-strong px-2 text-sm" />
                        <Button variant="ghost" size="sm" aria-label={`Remove ${name} hours`} onClick={() => setRules((all) => all.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      </div>))}
                    <div><Button variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setRules((all) => [...all, { weekday: d, startMinute: 540, endMinute: 1080 }])}>Add hours</Button></div>
                  </div>
                </div>);
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" size="sm" onClick={copyMon}>Copy Monday to Tue-Fri</Button><span className="text-xs text-muted">Time zone: {data.timezone}</span></div>
          <Toggle label="By appointment only" description="Customers see you as bookable, but not 'available now'." checked={appt} onChange={setAppt} />
          {invalid && <p role="alert" className="text-sm font-medium text-danger">Each end time must be after its start time.</p>}
          <Err e={save.error} />
          <div><Button size="lg" loading={save.isPending} disabled={invalid} onClick={() => save.mutate()}>{cta}</Button></div>
          <div className="card p-5">
            <h3 className="font-semibold">Time off</h3>
            <ul className="mt-2 divide-y divide-divider">{data.exceptions.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{formatDateTime(x.startsAt)} to {formatDateTime(x.endsAt)}{x.reason ? ` · ${x.reason}` : ''}</span><Button variant="ghost" size="sm" aria-label="Remove time off" onClick={() => delEx.mutate(x.id)}><Trash2 className="h-4 w-4 text-danger" /></Button></li>))}
              {data.exceptions.length === 0 && <li className="py-2 text-sm text-muted">No time off scheduled.</li>}</ul>
            <div className="mt-3 grid gap-3 sm:grid-cols-3"><Input label="From" type="datetime-local" value={ex.startsAt} onChange={(e) => setEx({ ...ex, startsAt: e.target.value })} /><Input label="Until" type="datetime-local" value={ex.endsAt} onChange={(e) => setEx({ ...ex, endsAt: e.target.value })} /><Input label="Reason" value={ex.reason} onChange={(e) => setEx({ ...ex, reason: e.target.value })} /></div>
            <Button className="mt-3" variant="secondary" size="sm" disabled={!ex.startsAt || !ex.endsAt || new Date(ex.endsAt) <= new Date(ex.startsAt)} loading={addEx.isPending} onClick={() => addEx.mutate()}>Add time off</Button>
            <Err e={addEx.error ?? delEx.error} />
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}

export function StepPortfolio({ mine, done, cta = 'Continue' }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-provider'] });
  const add = useMutation({ mutationFn: (url: string) => api.providers.addPortfolio({ kind: 'IMAGE', url }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (id: string) => api.providers.deletePortfolio(id), onSuccess: refresh });
  const items = mine?.portfolio ?? [];
  return (
    <div className="flex flex-col gap-5">
      <FileUpload purpose="PORTFOLIO" label="Upload photos" multiple onUploaded={(url) => add.mutate(url)} />
      <Err e={add.error ?? del.error} />
      {items.length === 0 ? <EmptyState title="No portfolio photos yet" text="Profiles with photos of past work get more chats." /> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((it) => (
          <li key={it.id} className="relative overflow-hidden rounded-lg border border-line"><img src={it.url} alt={it.title ?? ''} className="aspect-square w-full object-cover" loading="lazy" />
            <button type="button" aria-label="Delete photo" onClick={() => del.mutate(it.id)} className="absolute right-2 top-2 rounded-full bg-white p-2 shadow-sm"><Trash2 className="h-4 w-4 text-danger" /></button></li>))}
        </ul>)}
      <div><Button size="lg" onClick={done}>{cta}</Button></div>
    </div>
  );
}

export function StepVerification({ mine, done, cta = 'Continue' }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const [sent, setSent] = useState<string[]>([]);
  const submit = useMutation({
    mutationFn: ({ type, url, name }: { type: 'IDENTITY' | 'QUALIFICATION'; url: string; name: string }) => api.providers.submitVerification({ type, documentUrl: url, label: name.slice(0, 120) }),
    onSuccess: (_d, v) => { setSent((s) => [...s, v.type]); void qc.invalidateQueries({ queryKey: ['my-provider'] }); },
  });
  const v = mine?.verification;
  const tone = (s?: string) => (s === 'APPROVED' ? 'success' : s === 'PENDING' ? 'warning' : s === 'REJECTED' ? 'danger' : 'neutral') as 'success' | 'warning' | 'danger' | 'neutral';
  const Card = ({ type, title, text, status }: { type: 'IDENTITY' | 'QUALIFICATION'; title: string; text: string; status?: string }) => (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-subtle">{text}</p></div><Tag tone={tone(status)}>{sent.includes(type) && status === 'NONE' ? 'Submitted' : (status ?? 'NONE').toLowerCase().replace('none', 'Not submitted')}</Tag></div>
      {status !== 'APPROVED' && <FileUpload purpose="VERIFICATION" accept="image/jpeg,image/png,image/webp,application/pdf" label="Upload document" onUploaded={(url, file) => submit.mutate({ type, url, name: file.name })} />}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center justify-between gap-3 p-5"><div><h3 className="font-semibold">Mobile number</h3><p className="text-sm text-subtle">Verified when you sign in with OTP or link your phone.</p></div><Tag tone={v?.mobile ? 'success' : 'neutral'}>{v?.mobile ? 'Verified' : 'Not verified'}</Tag></div>
      <Card type="IDENTITY" title="Government ID" text="Aadhaar, PAN, driving licence or passport. Reviewed by our team; never shown publicly." status={v?.identity} />
      <Card type="QUALIFICATION" title="Qualification" text="A certificate or licence for your profession." status={v?.qualification} />
      <p className="flex items-center gap-2 text-xs text-muted"><FileCheck2 className="h-4 w-4" aria-hidden />Verification is optional now. You can add documents later from your profile.</p>
      <Err e={submit.error} />
      <div><Button size="lg" onClick={done}>{cta}</Button></div>
    </div>
  );
}
