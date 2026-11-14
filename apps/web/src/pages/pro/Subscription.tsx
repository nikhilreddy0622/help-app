import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { errorMessage, useApi } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { Seo } from '../../components/ui/Seo';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Bits';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, QueryBoundary, SkeletonList } from '../../components/ui/States';
import { PlanCard, PlanPicker, SubscribeStatus, useSubscribe } from '../../components/subscription/useSubscribe';
import { SubscriptionBanner } from './Dashboard';

function Payments() {
  const api = useApi();
  const q = useQuery({ queryKey: ['payments'], queryFn: () => api.payments.mine() });
  return (
    <QueryBoundary query={q} skeleton={<SkeletonList rows={3} height="h-12" />} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No payments yet" text="Your payment history will appear here after your first charge." />}>
      {(list) => (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Payment history</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wide text-subtle"><tr><th scope="col" className="p-3">Date</th><th scope="col" className="p-3">Amount</th><th scope="col" className="p-3">Method</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3"><span className="sr-only">Receipt</span></th></tr></thead>
            <tbody className="divide-y divide-divider">{list.map((p) => (
              <tr key={p.id}><td className="p-3">{formatDate(p.paidAt)}</td><td className="p-3 font-medium">{formatINR(p.amountPaise)}</td><td className="p-3 text-subtle">{p.method ?? '—'}</td>
                <td className="p-3"><Tag tone={p.status.toUpperCase() === 'CAPTURED' || p.status.toUpperCase() === 'PAID' ? 'success' : p.status.toUpperCase() === 'FAILED' ? 'danger' : 'neutral'}>{p.status.toLowerCase()}</Tag></td>
                <td className="p-3"><Link to={`/pro/subscription/receipts/${p.id}`} className="inline-flex items-center gap-1 font-semibold"><FileText className="h-4 w-4" aria-hidden />Receipt</Link></td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </QueryBoundary>
  );
}

export default function Subscription() {
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine() });
  const [plan, setPlan] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const s = useSubscribe();
  const cancel = useMutation({ mutationFn: () => api.subscriptions.cancel(), onSuccess: (d) => { qc.setQueryData(['subscription'], d); void qc.invalidateQueries({ queryKey: ['provider-dashboard'] }); setConfirm(false); } });
  return (
    <div className="flex flex-col gap-6">
      <Seo title="Subscription and billing" noindex />
      <h1 className="text-2xl font-bold tracking-tight">Subscription and billing</h1>
      <QueryBoundary query={q} skeleton={<SkeletonList rows={2} height="h-32" />}>
        {(sub) => {
          const live = !!sub && ['ACTIVE', 'PAST_DUE', 'PENDING'].includes(sub.status);
          return (
            <>
              <SubscriptionBanner sub={sub} />
              {sub && live ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <PlanCard plan={sub.plan} />
                  <div className="card flex flex-col gap-3 p-5 text-sm">
                    <div className="flex items-center justify-between"><span className="text-subtle">Status</span><Tag tone={sub.status === 'ACTIVE' ? 'success' : sub.status === 'PAST_DUE' ? 'warning' : 'info'}>{sub.status.replace('_', ' ').toLowerCase()}</Tag></div>
                    <div className="flex justify-between"><span className="text-subtle">{sub.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}</span><b>{formatDate(sub.currentPeriodEnd) || '—'}</b></div>
                    {sub.status === 'PAST_DUE' && sub.graceEndsAt && <div className="flex justify-between"><span className="text-subtle">Grace period ends</span><b>{formatDate(sub.graceEndsAt)}</b></div>}
                    {!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && <Button variant="secondary" onClick={() => setConfirm(true)}>Cancel renewal</Button>}
                    {sub.cancelAtPeriodEnd && <p className="text-subtle">Renewal is off. Resubscribe after it ends to stay visible.</p>}
                  </div>
                </div>
              ) : (
                <div className="card flex flex-col gap-4 p-5">
                  <h2 className="font-semibold">{sub ? 'Resubscribe' : 'Choose a plan'}</h2>
                  <PlanPicker value={plan} onChange={setPlan} />
                  <div><Button size="lg" disabled={!plan || s.busy} loading={s.busy} onClick={() => plan && void s.run(plan)}>Subscribe with Razorpay</Button></div>
                  <SubscribeStatus phase={s.phase} error={s.error} />
                  <p className="text-xs text-muted">Your plan switches on only after our server confirms your payment.</p>
                </div>
              )}
              <Modal open={confirm} onClose={() => setConfirm(false)} title="Turn off renewal?"
                footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(false)}>Keep renewing</Button><Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel renewal</Button></div>}>
                <ul className="list-inside list-disc space-y-2 text-sm text-ink">
                  <li>You keep full access until <b>{formatDate(sub?.currentPeriodEnd)}</b>. You will not be charged again.</li>
                  <li>After that, your profile is hidden from search and customers cannot start new chats with you.</li>
                  <li>Your profile, reviews and existing conversations are never deleted.</li>
                  <li>Refunds follow our <Link to="/legal/cancellation-refund">cancellation and refund policy</Link>. [Pending legal review]</li>
                </ul>
                {cancel.isError && <p role="alert" className="mt-3 text-sm font-medium text-danger">{errorMessage(cancel.error)}</p>}
              </Modal>
            </>
          );
        }}
      </QueryBoundary>
      <section><h2 className="mb-3 text-lg font-semibold">Payment history</h2><Payments /></section>
    </div>
  );
}
