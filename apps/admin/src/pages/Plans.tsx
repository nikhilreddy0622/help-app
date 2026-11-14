import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { SubscriptionPlanDto } from '@help/types';
import { api, errMsg, handleAuthError } from '../lib/api';
import { formatINR } from '../lib/format';
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, Notice, PageHeader, Select, StatusBadge, TableSkeleton, Textarea, useActions } from '../components/ui';

type Plan = SubscriptionPlanDto & { isActive: boolean };

function PlanForm({ plan, onClose }: { plan: Plan | 'new'; onClose: () => void }) {
  const { toast } = useActions();
  const qc = useQueryClient();
  const ex = plan === 'new' ? null : plan;
  const [code, setCode] = useState(ex?.code ?? '');
  const [name, setName] = useState(ex?.name ?? '');
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>(ex?.interval ?? 'MONTHLY');
  const [rupees, setRupees] = useState(ex ? String(ex.pricePaise / 100) : '');
  const [features, setFeatures] = useState(ex?.features.join('\n') ?? '');
  const [active, setActive] = useState(ex?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const paise = Math.round(parseFloat(rupees) * 100);
  const valid = name.trim().length >= 2 && Number.isFinite(paise) && paise >= 100 && (ex || /^[A-Z0-9_]{2,40}$/.test(code));
  const priceChanged = !!ex && paise !== ex.pricePaise;

  const save = async () => {
    setBusy(true);
    try {
      const feats = features.split('\n').map((s) => s.trim()).filter(Boolean);
      if (ex) await api.admin.updatePlan(ex.id, { name: name.trim(), interval, pricePaise: paise, features: feats, isActive: active });
      else await api.admin.createPlan({ code, name: name.trim(), interval, pricePaise: paise, features: feats, isActive: active });
      toast('success', ex ? 'Plan updated' : 'Plan created');
      await qc.invalidateQueries();
      onClose();
    } catch (e) { handleAuthError(e); toast('error', errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open title={ex ? 'Edit plan' : 'New plan'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={save}>{priceChanged ? 'Confirm price change and save' : 'Save'}</Button></>}>
      {!ex && <Field label="Code" hint="Uppercase letters, digits and underscore, e.g. PRO_MONTHLY">{(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />}</Field>}
      <Field label="Name">{(id) => <Input id={id} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}</Field>
      <Field label="Billing interval">{(id) => <Select id={id} value={interval} onChange={(e) => setInterval(e.target.value as 'MONTHLY' | 'YEARLY')}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></Select>}</Field>
      <Field label="Price (INR)" hint={Number.isFinite(paise) ? `Stored as ${paise} paise` : 'Minimum 1.00'}>{(id) => <Input id={id} type="number" min="1" step="0.01" value={rupees} onChange={(e) => setRupees(e.target.value)} />}</Field>
      {priceChanged && <Notice>Changing the price affects <strong>new subscriptions only</strong>. Existing subscribers keep their current price until they resubscribe.</Notice>}
      <Field label="Features (one per line)">{(id) => <Textarea id={id} rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} />}</Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />Active (available for new subscriptions)</label>
    </Modal>
  );
}

export function Plans() {
  const { run } = useActions();
  const [form, setForm] = useState<Plan | 'new' | null>(null);
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api.admin.plans().catch((e) => { handleAuthError(e); throw e; }) });
  const rows = q.data ?? [];
  const toggle = (p: Plan) => run(
    { title: p.isActive ? 'Deactivate plan' : 'Activate plan', description: p.isActive ? `${p.name} will stop being offered to new subscribers. Existing subscriptions continue.` : `${p.name} will be offered to new subscribers.`, confirmLabel: p.isActive ? 'Deactivate' : 'Activate', danger: p.isActive, success: p.isActive ? 'Plan deactivated' : 'Plan activated' },
    () => api.admin.updatePlan(p.id, { isActive: !p.isActive }),
  );
  return (
    <>
      <PageHeader title="Plans" subtitle="Provider subscription plans" actions={<Button variant="primary" onClick={() => setForm('new')}><Plus className="h-4 w-4" aria-hidden />New plan</Button>} />
      <Card>
        {q.isPending ? <TableSkeleton cols={5} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : rows.length === 0 ? <EmptyState title="No plans" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr><th scope="col" className="px-4 py-3">Plan</th><th scope="col" className="px-4 py-3">Code</th><th scope="col" className="px-4 py-3">Interval</th><th scope="col" className="px-4 py-3 text-right">Price</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted">{p.code}</td>
                    <td className="px-4 py-3">{p.interval === 'MONTHLY' ? 'Monthly' : 'Yearly'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.pricePaise)}</td>
                    <td className="px-4 py-3"><StatusBadge value={p.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => setForm(p)}>Edit</Button><Button size="sm" variant={p.isActive ? 'danger' : 'secondary'} onClick={() => toggle(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {form && <PlanForm key={form === 'new' ? 'new' : form.id} plan={form} onClose={() => setForm(null)} />}
    </>
  );
}
