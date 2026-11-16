import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Copy, MapPin, Radio, Zap } from 'lucide-react';
import type { IncomingLiveRequest, LiveResponder } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { categoriesQuery } from '../../lib/queries';
import { useUserLocation } from '../../state/LocationContext';
import { Seo } from '../../components/ui/Seo';
import { Button, LinkButton } from '../../components/ui/Button';
import { Chip, Input, Textarea } from '../../components/ui/Field';
import { Avatar, Stars } from '../../components/ui/Bits';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States';


// ----------------------------------------------------------------- customer: create
export function RequestNow() {
  const api = useApi();
  const nav = useNavigate();
  const { location } = useUserLocation();
  const cats = useQuery(categoriesQuery(api));
  const [categoryId, setCategoryId] = useState<string>();
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const liveCats = useMemo(() => (cats.data ?? []).filter((c) => c.supportsLiveRequest), [cats.data]);

  const create = useMutation({
    mutationFn: () => api.liveRequests.create({ categoryId: categoryId!, lat: location.lat, lng: location.lng, note: note.trim() || undefined, urgent }),
    onSuccess: () => nav('/live/status'),
  });

  return (
    <div className="mx-auto max-w-xl">
      <Seo title="Request help now" noindex />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight"><Zap className="h-6 w-6 text-teal" aria-hidden />Request now</h1>
      <p className="mb-5 text-sm text-subtle">We’ll alert available professionals near you. Interested ones respond and you choose who to contact.</p>

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-navy">What do you need?</p>
          {cats.isPending ? <SkeletonList rows={3} /> : liveCats.length === 0 ? <p className="text-sm text-subtle">Live requests aren’t available yet.</p> : (
            <div className="flex flex-wrap gap-2">{liveCats.map((c) => <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>)}</div>
          )}
        </div>
        <Textarea label="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder="e.g. Pipe burst under the sink, need someone now" rows={3} />
        <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3">
          <span><span className="block font-medium text-navy">Mark as urgent</span><span className="text-sm text-subtle">Alerts pros even during their quiet hours.</span></span>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-5 w-5 accent-teal-700" />
        </label>
        <p className="text-xs text-subtle">Your exact location stays private — pros see only the approximate area until you pick one. Using: {location.label}.</p>
        {create.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(create.error)}</p>}
        <Button size="lg" icon={<Zap className="h-5 w-5" />} disabled={!categoryId} loading={create.isPending} onClick={() => create.mutate()}>Send request</Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- customer: status
export function LiveStatus() {
  const api = useApi();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['live-mine'], queryFn: () => api.liveRequests.mine(), refetchInterval: 12_000 });
  const [picked, setPicked] = useState<{ phone: string | null; name: string } | null>(null);

  const cancel = useMutation({ mutationFn: () => api.liveRequests.cancel(q.data!.id), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['live-mine'] }); nav('/'); } });
  const connect = useMutation({
    mutationFn: (r: LiveResponder) => api.liveRequests.connect(q.data!.id, r.providerId).then((res) => ({ res, r })),
    onSuccess: ({ res, r }) => { void qc.invalidateQueries({ queryKey: ['live-mine'] }); if (res.conversationId) nav(`/account/messages/${res.conversationId}`); else setPicked({ phone: res.phone, name: r.displayName }); },
  });

  if (q.isPending) return <div className="mx-auto max-w-xl"><SkeletonList rows={3} /></div>;
  if (q.isError) return <div className="mx-auto max-w-xl"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>;
  const req = q.data;
  if (!req) return <div className="mx-auto max-w-xl py-10"><EmptyState icon={<Radio className="h-7 w-7 text-muted" />} title="No active request" text="Post a request and available pros nearby can respond." action={<LinkButton to="/live/new">Request now</LinkButton>} /></div>;

  return (
    <div className="mx-auto max-w-xl">
      <Seo title="Your request" noindex />
      <div className="mb-4 rounded-xl border border-line bg-white p-4">
        <div className="flex items-center gap-2">
          {req.urgent && <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger"><Zap className="h-3 w-3" />Urgent</span>}
          <h1 className="flex-1 text-lg font-bold text-navy">{req.categoryName}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${req.status === 'OPEN' ? 'bg-teal-tint text-teal-800' : 'bg-surface text-subtle'}`}>{req.status === 'OPEN' ? 'Live' : req.status === 'CONNECTED' ? 'Connected' : 'Closed'}</span>
        </div>
        {req.note && <p className="mt-2 text-sm text-ink">{req.note}</p>}
        {req.status === 'OPEN' && <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle"><Clock className="h-3.5 w-3.5" />Waiting for responses… expires {new Date(req.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>}
      </div>

      <p className="mb-2 text-sm font-medium text-navy">{req.responders.length > 0 ? `${req.responders.length} responded` : 'Responders'}</p>
      {req.responders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-white p-6 text-center text-sm text-subtle">No responses yet. Pros nearby are being alerted — hang tight.</div>
      ) : (
        <ul className="flex flex-col gap-3">{req.responders.map((r) => (
          <li key={r.providerId} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar name={r.displayName} src={r.avatarUrl} size={44} />
              <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{r.displayName}</p><div className="flex items-center gap-3 text-sm"><Stars value={r.ratingAvg} count={r.ratingCount} size="sm" />{r.distanceKm != null && <span className="flex items-center gap-1 text-subtle"><MapPin className="h-3.5 w-3.5" />{r.distanceKm} km</span>}</div></div>
              {r.etaMinutes != null && <div className="text-right"><p className="font-bold text-navy">~{r.etaMinutes}m</p><p className="text-xs text-subtle">ETA</p></div>}
            </div>
            {r.message && <p className="mt-2 text-sm text-ink">“{r.message}”</p>}
            {req.status === 'OPEN' && <Button className="mt-3 w-full" loading={connect.isPending} onClick={() => connect.mutate(r)}>Connect</Button>}
          </li>
        ))}</ul>
      )}
      {req.status === 'OPEN' && <Button variant="ghost" className="mt-4" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel request</Button>}

      {picked && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPicked(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-sm text-subtle">{picked.name}’s number</p>
            {picked.phone ? <><p className="select-all text-3xl font-bold text-navy">{picked.phone}</p><Button className="mt-4 w-full" icon={<Copy className="h-5 w-5" />} onClick={() => navigator.clipboard?.writeText(picked.phone ?? '')}>Copy number</Button></> : <p className="text-sm text-subtle">This professional prefers to be contacted in chat.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- provider: incoming feed
export function LiveIncoming() {
  const api = useApi();
  const { location } = useUserLocation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['live-incoming'], queryFn: () => api.liveRequests.incoming({ lat: location.lat, lng: location.lng }), refetchInterval: 12_000 });
  const [respondTo, setRespondTo] = useState<IncomingLiveRequest | null>(null);
  const [eta, setEta] = useState('');
  const [msg, setMsg] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['live-incoming'] });
  const respond = useMutation({ mutationFn: () => api.liveRequests.respond(respondTo!.id, { etaMinutes: eta ? Number(eta) : undefined, message: msg.trim() || undefined }), onSuccess: () => { void refresh(); setRespondTo(null); setEta(''); setMsg(''); } });
  const withdraw = useMutation({ mutationFn: (id: string) => api.liveRequests.withdraw(id), onSuccess: () => void refresh() });

  return (
    <div className="mx-auto max-w-2xl">
      <Seo title="Live requests" noindex />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight"><Zap className="h-6 w-6 text-teal" aria-hidden />Live requests</h1>
      <p className="mb-5 text-sm text-subtle">Customers nearby who need your service right now. You choose whether to respond.</p>
      {q.isPending ? <SkeletonList rows={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
        <EmptyState icon={<Radio className="h-7 w-7 text-muted" />} title="No live requests right now" text="When a customer nearby needs your service, it shows here. Keep your status Available to receive them." />
      ) : (
        <ul className="flex flex-col gap-3">{q.data.map((r) => {
          const mine = r.myResponse?.status === 'INTERESTED';
          return (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center gap-2">
                {r.urgent && <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger"><Zap className="h-3 w-3" />Urgent</span>}
                <h2 className="flex-1 font-semibold text-navy">{r.categoryName}</h2>
                {r.distanceKm != null && <span className="flex items-center gap-1 text-sm text-subtle"><MapPin className="h-3.5 w-3.5" />{r.distanceKm} km</span>}
              </div>
              {r.note ? <p className="mt-1 text-sm text-ink">{r.note}</p> : <p className="mt-1 text-sm text-subtle">No extra details.</p>}
              {mine ? (
                <div className="mt-3 flex items-center justify-between"><span className="text-sm font-medium text-teal-800">You responded{r.myResponse?.etaMinutes != null ? ` · ETA ~${r.myResponse.etaMinutes}m` : ''}</span><Button variant="ghost" size="sm" onClick={() => withdraw.mutate(r.id)}>Withdraw</Button></div>
              ) : <Button className="mt-3" onClick={() => { setRespondTo(r); setEta(''); setMsg(''); }}>I can help</Button>}
            </li>
          );
        })}</ul>
      )}

      {respondTo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setRespondTo(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-navy">Respond to this request</h3>
            <p className="mb-4 text-sm text-subtle">The customer sees your name, rating and distance, and picks who to contact.</p>
            <div className="flex flex-col gap-3">
              <Input label="ETA in minutes (optional)" inputMode="numeric" value={eta} onChange={(e) => setEta(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 15" />
              <Textarea label="Message (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={240} rows={2} placeholder="e.g. On my way, have tools ready" />
              {respond.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(respond.error)}</p>}
              <Button loading={respond.isPending} onClick={() => respond.mutate()}>Send response</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- provider: settings
export function LiveSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['live-settings'], queryFn: () => api.liveRequests.settings() });
  const [accepts, setAccepts] = useState(true);
  useEffect(() => { if (q.data) setAccepts(q.data.acceptsLiveRequests); }, [q.data]);
  const save = useMutation({ mutationFn: (v: boolean) => api.liveRequests.setSettings({ acceptsLiveRequests: v }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['live-settings'] }), onError: () => setAccepts((x) => !x) });

  return (
    <div className="mx-auto max-w-xl">
      <Seo title="Live request settings" noindex />
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Live requests</h1>
      {q.isPending ? <SkeletonList rows={3} /> : (
        <>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-4">
            <span><span className="block font-medium text-navy">Accept live requests</span><span className="text-sm text-subtle">Customers nearby who need your service right now can alert you. You choose whether to respond.</span></span>
            <input type="checkbox" checked={accepts} onChange={(e) => { setAccepts(e.target.checked); save.mutate(e.target.checked); }} className="h-5 w-5 accent-teal-700" />
          </label>
          <p className="mt-3 text-xs text-subtle">You only receive live requests in your primary category while your status is Available. Hiring and payment happen directly with the customer. <Link className="text-teal-700 underline" to="/pro/live">View live requests</Link></p>
        </>
      )}
    </div>
  );
}
