import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PresenceStatus, ProviderDashboard } from '@help/types';
import { STATUS_FRESH_HOURS, STATUS_MESSAGE_MAX } from '@help/domain';
import { presenceStyle } from '@help/ui-tokens';
import { errorMessage, useApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Chip, Input, Toggle } from '../ui/Field';
import { PresenceNote, PresencePill } from '../ui/Presence';

type Presence = ProviderDashboard['presence'];
const SUGGESTIONS = ['On a job, back by 6 PM', 'Available from Monday', 'On leave this week'];
type UntilKind = 'today' | 'tomorrow' | 'pick' | 'manual';

function untilDate(kind: UntilKind, pick: string): Date | null {
  const now = new Date();
  if (kind === 'today') { const d = new Date(now); d.setHours(21, 0, 0, 0); return d.getTime() > now.getTime() + 600_000 ? d : new Date(now.getTime() + 2 * 3_600_000); }
  if (kind === 'tomorrow') { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }
  if (kind === 'pick' && pick) return new Date(pick);
  return null;
}

/** Status card: Available / Busy / Away, a short note, "until" and the discoverability switch. */
export function StatusCard({ presence }: { presence: Presence }) {
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<PresenceStatus>(presence.status);
  const [message, setMessage] = useState(presence.statusMessage ?? '');
  const [until, setUntil] = useState<UntilKind>(presence.statusUntil ? 'pick' : 'manual');
  const [pick, setPick] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apply = (p: Presence) => qc.setQueryData<ProviderDashboard>(['provider-dashboard'], (o) => (o ? { ...o, presence: p } : o));
  const save = useMutation({ mutationFn: () => {
    const when = status === 'AVAILABLE' ? null : untilDate(until, pick);
    return api.providers.setStatus({ status, message: message.trim() || null, until: when });
  }, onSuccess: (p) => { setError(null); apply(p); } });
  const confirm = useMutation({ mutationFn: () => api.providers.confirmStatus(), onSuccess: apply });
  const visible = useMutation({ mutationFn: (v: boolean) => api.providers.setVisibility(v), onSuccess: apply });

  const stale = presence.statusUpdatedAt ? Date.now() - new Date(presence.statusUpdatedAt).getTime() > STATUS_FRESH_HOURS * 3_600_000 : true;
  const keys = ['AVAILABLE', 'BUSY', 'AWAY'] as const;
  const submit = () => {
    if (until === 'pick' && status !== 'AVAILABLE' && !pick) { setError('Choose a date and time, or pick another option.'); return; }
    setError(null); save.mutate();
  };

  return (
    <section className="card p-5" aria-labelledby="status-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="status-h" className="text-lg font-semibold">Your status</h2>
        <div className="flex flex-col items-end gap-0.5"><PresencePill status={presence.isPaused ? 'PAUSED' : presence.status} label={presence.isPaused ? 'Hidden from customers' : presence.statusLabel} /><PresenceNote message={null} updatedAt={presence.statusUpdatedAt} /></div>
      </div>
      <p className="mt-1 text-sm text-subtle">Customers see this on your card and profile. Keep it fresh so they know when to reach you.</p>

      {stale && !presence.isPaused && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-bg p-3 text-sm text-warning-fg">
          <span className="font-medium">Still available? Customers trust statuses updated in the last day.</span>
          <Button size="sm" variant="secondary" loading={confirm.isPending} onClick={() => confirm.mutate()}>Confirm</Button>
        </div>
      )}

      <div role="radiogroup" aria-label="Status" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
        {keys.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={status === k} onClick={() => setStatus(k)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${status === k ? 'bg-white text-navy shadow-sm' : 'text-subtle'}`}>
            <span aria-hidden style={{ background: presenceStyle[k].dot }} className="h-2.5 w-2.5 rounded-full" />{presenceStyle[k].name}
          </button>))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Input label="Message (optional)" value={message} maxLength={STATUS_MESSAGE_MAX} onChange={(e) => setMessage(e.target.value)} hint={`${message.length}/${STATUS_MESSAGE_MAX}`} />
        <div className="-mt-1 flex flex-wrap gap-2" role="group" aria-label="Message suggestions">{SUGGESTIONS.map((s) => <Chip key={s} active={message === s} onClick={() => setMessage(s)}>{s}</Chip>)}</div>
        {status !== 'AVAILABLE' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy">Until</legend>
            <div className="flex flex-wrap gap-2">
              <Chip active={until === 'today'} onClick={() => setUntil('today')}>Later today</Chip>
              <Chip active={until === 'tomorrow'} onClick={() => setUntil('tomorrow')}>Tomorrow</Chip>
              <Chip active={until === 'pick'} onClick={() => setUntil('pick')}>Pick date and time</Chip>
              <Chip active={until === 'manual'} onClick={() => setUntil('manual')}>Until I change it</Chip>
            </div>
            {until === 'pick' && <div className="mt-3 max-w-xs"><Input label="Back on" type="datetime-local" value={pick} onChange={(e) => setPick(e.target.value)} /></div>}
          </fieldset>
        )}
      </div>
      {(error || save.isError || confirm.isError || visible.isError) && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error ?? errorMessage(save.error ?? confirm.error ?? visible.error)}</p>}
      {save.isSuccess && !save.isPending && <p role="status" className="mt-3 text-sm font-medium text-success-fg">Status updated.</p>}
      <div className="mt-4"><Button size="lg" loading={save.isPending} onClick={submit}>Update status</Button></div>

      <div className="mt-5 border-t border-divider pt-3">
        <Toggle label="Show my profile to customers" description="Turn off to pause. You stay signed in and keep your data." checked={!presence.isPaused} onChange={(v) => visible.mutate(v)} />
        {presence.isPaused && <p className="mt-1 rounded-md bg-surface p-3 text-sm text-subtle">Your profile is paused. It is hidden from search and customers cannot start new chats. Existing conversations stay open. Turn this back on when you are ready.</p>}
      </div>
    </section>
  );
}
