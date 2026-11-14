import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import type { SubscriptionPlanDto } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { openRazorpay } from '../../lib/external';
import { formatINR } from '../../lib/format';
import { useAuth } from '../../state/AuthContext';
import { QueryBoundary, SkeletonList } from '../ui/States';

export type Phase = 'idle' | 'creating' | 'paying' | 'verifying' | 'confirming' | 'active' | 'timeout' | 'error';

/**
 * Razorpay subscription checkout. Activation is decided only by the server:
 * after the handler we call subscriptions.verify, then poll subscriptions.mine until ACTIVE.
 */
export function useSubscribe() {
  const api = useApi();
  const qc = useQueryClient();
  const { me } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(() => {
    for (const k of ['subscription', 'my-provider', 'provider-dashboard', 'payments']) void qc.invalidateQueries({ queryKey: [k] });
  }, [qc]);

  const poll = useCallback(async () => {
    setPhase('confirming');
    for (let i = 0; i < 20 && alive.current; i++) {
      try {
        const s = await api.subscriptions.mine();
        if (s?.status === 'ACTIVE') { setPhase('active'); refresh(); return; }
      } catch { /* keep polling */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (alive.current) { setPhase('timeout'); refresh(); }
  }, [api, refresh]);

  const run = useCallback(async (planId: string) => {
    setError(null); setPhase('creating');
    try {
      const s = await api.subscriptions.checkout(planId);
      setPhase('paying');
      await openRazorpay({
        keyId: s.razorpayKeyId, subscriptionId: s.razorpaySubscriptionId, description: s.plan.name,
        prefill: { name: me?.name ?? undefined, email: me?.email ?? undefined, contact: me?.phone ?? undefined },
        onDismiss: () => setPhase((p) => (p === 'paying' ? 'idle' : p)),
        onSuccess: (r) => {
          setPhase('verifying');
          api.subscriptions.verify(r).then(() => poll(), () => poll()); // webhook may still confirm even if verify fails
        },
      });
    } catch (e) { setError(errorMessage(e)); setPhase('error'); }
  }, [api, me, poll]);

  return { phase, error, run, busy: ['creating', 'paying', 'verifying', 'confirming'].includes(phase) };
}

export function SubscribeStatus({ phase, error }: { phase: Phase; error: string | null }) {
  if (phase === 'idle') return null;
  const msg: Record<Phase, string> = {
    idle: '', creating: 'Setting up your subscription...', paying: 'Complete the payment in the Razorpay window.',
    verifying: 'Payment received. Verifying the signature with our server...',
    confirming: 'Waiting for server confirmation. Your plan switches on only after our server confirms the payment, usually within a few seconds. Please keep this page open.',
    active: 'Your subscription is active. Thank you.',
    timeout: 'We have not received confirmation yet. If your payment went through, your plan will activate automatically once the payment provider confirms it. You can safely leave this page.',
    error: error ?? 'Something went wrong. You have not been charged unless you completed payment.',
  };
  const tone = phase === 'active' ? 'bg-success-bg text-success-fg' : phase === 'error' ? 'bg-danger-bg text-danger' : phase === 'timeout' ? 'bg-warning-bg text-warning-fg' : 'bg-info-bg text-info-fg';
  return <p role={phase === 'error' ? 'alert' : 'status'} className={`rounded-md p-3 text-sm font-medium ${tone}`}>{msg[phase]}</p>;
}

export function PlanPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const api = useApi();
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api.subscriptions.plans(), staleTime: 5 * 60_000 });
  return (
    <QueryBoundary query={q} skeleton={<SkeletonList rows={2} height="h-28" />} isEmpty={(d) => d.length === 0}>
      {(plans) => (
        <div role="radiogroup" aria-label="Choose a plan" className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => <PlanCard key={p.id} plan={p} selected={value === p.id} onSelect={() => onChange(p.id)} />)}
        </div>
      )}
    </QueryBoundary>
  );
}

export function PlanCard({ plan, selected, onSelect }: { plan: SubscriptionPlanDto; selected?: boolean; onSelect?: () => void }) {
  const Tag = onSelect ? 'button' : 'div';
  return (
    <Tag {...(onSelect ? { type: 'button' as const, role: 'radio', 'aria-checked': selected, onClick: onSelect } : {})}
      className={`card flex flex-col gap-3 p-5 text-left ${selected ? 'border-teal-700 ring-1 ring-teal-700' : ''}`}>
      <span className="text-sm font-semibold text-subtle">{plan.name}</span>
      <span className="text-3xl font-bold tracking-tight text-navy">{formatINR(plan.pricePaise)}<span className="text-sm font-medium text-subtle"> / {plan.interval === 'YEARLY' ? 'year' : 'month'}</span></span>
      <ul className="flex flex-col gap-1.5 text-sm text-ink">{plan.features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-teal" aria-hidden />{f}</li>)}</ul>
    </Tag>
  );
}
