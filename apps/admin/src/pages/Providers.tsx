import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { presenceStyle } from '@help/ui-tokens';
import type { AdminRow } from '@help/api-client';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canMutateProviders } from '../lib/roles';
import { fmtDate, fmtDay, get, humanize, str } from '../lib/format';
import { Badge, Button, Drawer, ErrorState, Field, Input, Modal, Notice, PageHeader, Skeleton, StatusBadge, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

export const SPONSOR_NOTE = 'Sponsored providers are shown with a visible "Sponsored" label to customers. Sponsorship never changes verification badges or ratings.';

export const isHidden = (r: AdminRow) => get(r, 'status') === 'HIDDEN' || get(r, 'hidden') === true || get(r, 'isHidden') === true;
export const presenceOf = (r: AdminRow) => String(get(r, 'presence.status', 'presenceStatus', 'availability') ?? '').toUpperCase();
export const isPaused = (r: AdminRow) => presenceOf(r) === 'PAUSED' || get(r, 'presence.isPaused', 'isPaused') === true;

export function PresencePill({ r }: { r: AdminRow }) {
  const key = presenceOf(r) as keyof typeof presenceStyle;
  const st = presenceStyle[key];
  if (!st) return <span className="text-muted">-</span>;
  const label = String(get(r, 'presence.statusLabel', 'statusLabel') ?? st.name);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.fg }}>
      <span className="h-2 w-2 rounded-full" style={{ background: st.dot }} aria-hidden />{label}
    </span>
  );
}

export const sponsoredUntil = (r: AdminRow) => get(r, 'sponsoredUntil', 'sponsoredTill');

export function useProviderActions() {
  const { run } = useActions();
  const [sponsorFor, setSponsorFor] = useState<AdminRow | null>(null);
  const toggleHidden = (r: AdminRow) => {
    const name = str(get(r, 'displayName', 'name'));
    const hide = !isHidden(r);
    run(
      { title: hide ? 'Hide provider' : 'Unhide provider', description: hide ? `Hide ${name} from discovery and search.` : `Make ${name} visible again.`, confirmLabel: hide ? 'Hide' : 'Unhide', danger: hide, noteLabel: 'Reason', noteRequired: hide, success: hide ? 'Provider hidden' : 'Provider unhidden' },
      (n) => api.admin.setProviderVisibility(r.id, hide, n || undefined),
    );
  };
  const removeSponsor = (r: AdminRow) =>
    run({ title: 'Remove sponsorship', description: `End sponsorship for ${str(get(r, 'displayName', 'name'))} immediately.`, confirmLabel: 'Remove', danger: true, success: 'Sponsorship removed' }, () => api.admin.setSponsored(r.id, null));
  const modal = <SponsorModal row={sponsorFor} onClose={() => setSponsorFor(null)} />;
  return { toggleHidden, removeSponsor, openSponsor: setSponsorFor, modal };
}

function SponsorModal({ row, onClose }: { row: AdminRow | null; onClose: () => void }) {
  const { run } = useActions();
  const [date, setDate] = useState('');
  if (!row) return null;
  const today = new Date().toISOString().slice(0, 10);
  const submit = () => {
    const until = new Date(`${date}T23:59:59`).toISOString();
    const r = row;
    onClose();
    run(
      { title: 'Sponsor provider', description: <div className="space-y-3"><p>Sponsor {str(get(r, 'displayName', 'name'))} until {fmtDay(until)}.</p><Notice tone="blue">{SPONSOR_NOTE}</Notice></div>, confirmLabel: 'Sponsor', success: 'Sponsorship saved' },
      () => api.admin.setSponsored(r.id, until),
    );
  };
  return (
    <Modal open title="Sponsor provider" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!date} onClick={submit}>Continue</Button></>}>
      <Notice tone="blue">{SPONSOR_NOTE}</Notice>
      <Field label="Sponsor until">{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
    </Modal>
  );
}

const label = (k: string) => humanize(k.replace(/([A-Z])/g, '_$1'));

function Detail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['provider', id], queryFn: () => api.admin.provider(id) });
  if (q.isPending) return <div className="space-y-3"><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const r = q.data;
  const msg = get(r, 'presence.statusMessage', 'statusMessage');
  const upd = get(r, 'presence.statusUpdatedAt', 'statusUpdatedAt');
  const entries = Object.entries(r).filter(([k, v]) => k !== 'id' && v !== null && v !== undefined && typeof v !== 'object');
  const nested = Object.entries(r).filter(([, v]) => v && typeof v === 'object');
  const isDate = (k: string) => /At$|Until$|Date$/.test(k);
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-line p-3 text-sm">
        <div className="flex items-center gap-2"><span className="text-muted">Presence</span><PresencePill r={r} /></div>
        <div><span className="text-muted">Status message: </span>{msg ? String(msg) : '-'}</div>
        <div><span className="text-muted">Updated: </span>{fmtDate(upd)}</div>
      </div>
      <dl className="text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-3 gap-4 border-b border-line py-2">
            <dt className="text-muted">{label(k)}</dt>
            <dd className="col-span-2 break-words">{typeof v === 'string' && /^[A-Z_]+$/.test(v) ? <StatusBadge value={v} /> : isDate(k) ? fmtDate(v) : String(v)}</dd>
          </div>
        ))}
      </dl>
      {nested.map(([k, v]) => (
        <div key={k}>
          <h3 className="mb-1 text-sm font-semibold">{label(k)}</h3>
          <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(v, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export function Providers() {
  const { admin } = useAuth();
  const mutate = !!admin && canMutateProviders(admin.role);
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [sel, setSel] = useState<AdminRow | null>(openId ? { id: openId } : null);
  const pa = useProviderActions();
  const sponsorCell = (r: AdminRow) => { const u = sponsoredUntil(r); return u ? <Badge color="teal">Sponsored until {fmtDay(u)}</Badge> : <span className="text-muted">-</span>; };
  return (
    <>
      <PageHeader title="Providers" subtitle="Professionals listed on the marketplace" />
      <ListView
        id="providers"
        fetcher={(q) => api.admin.providers(q)}
        search="Search name, city or phone"
        filters={[
          { name: 'status', label: 'Status', options: ['DRAFT', 'PUBLISHED', 'HIDDEN', 'SUSPENDED'].map((v) => ({ value: v, label: humanize(v) })) },
          { name: 'presence', label: 'Presence', options: ['AVAILABLE', 'BUSY', 'AWAY', 'PAUSED'].map((v) => ({ value: v, label: v === 'PAUSED' ? 'Paused' : humanize(v) })) },
          { name: 'discoverable', label: 'Discoverable', options: [{ value: 'true', label: 'Discoverable' }, { value: 'false', label: 'Not discoverable' }] },
          { name: 'subscription', label: 'Subscription', options: ['ACTIVE', 'PAST_DUE', 'HALTED', 'CANCELLED', 'EXPIRED', 'NONE'].map((v) => ({ value: v, label: humanize(v) })) },
        ]}
        columns={[
          col.name('Provider', 'displayName', 'name'), col.text('City', 'city', 'location.city'), col.status(),
          { header: 'Presence', cell: (r) => <div className="flex flex-wrap items-center gap-1"><PresencePill r={r} />{isPaused(r) && <Badge color="amber">Paused</Badge>}</div> },
          { header: 'Status message', className: 'max-w-[200px]', cell: (r) => <span className="line-clamp-2 text-subtle">{str(get(r, 'presence.statusMessage', 'statusMessage'))}</span> },
          { header: 'Updated', cell: (r) => <span className="whitespace-nowrap text-subtle">{fmtDate(get(r, 'presence.statusUpdatedAt', 'statusUpdatedAt'))}</span> },
          { header: 'Discoverable', cell: (r) => <StatusBadge value={get(r, 'isDiscoverable', 'discoverable')} /> },
          col.status('Subscription', 'subscriptionStatus', 'subscription.status'),
          { header: 'Sponsored', cell: sponsorCell },
        ]}
        onRowClick={setSel}
        actions={mutate ? (r) => (
          <>
            <Button size="sm" onClick={() => pa.toggleHidden(r)}>{isHidden(r) ? 'Unhide' : 'Hide'}</Button>
            <Button size="sm" onClick={() => pa.openSponsor(r)}>Sponsor</Button>
          </>
        ) : undefined}
      />
      <Drawer open={!!sel} title={sel ? str(get(sel, 'displayName', 'name') ?? 'Provider') : ''} onClose={() => setSel(null)}>
        {sel && (
          <>
            {mutate && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => pa.toggleHidden(sel)}>{isHidden(sel) ? 'Unhide' : 'Hide'}</Button>
                <Button size="sm" onClick={() => pa.openSponsor(sel)}>Sponsor</Button>
                {!!sponsoredUntil(sel) && <Button size="sm" variant="danger" onClick={() => pa.removeSponsor(sel)}>Remove sponsorship</Button>}
              </div>
            )}
            <Detail id={sel.id} />
          </>
        )}
      </Drawer>
      {pa.modal}
    </>
  );
}
