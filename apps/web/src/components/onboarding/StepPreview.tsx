import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { errorMessage, useApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { QueryBoundary, SkeletonList } from '../ui/States';
import { ProfileView } from '../provider/ProfileView';
import { PlanPicker, SubscribeStatus, useSubscribe } from '../subscription/useSubscribe';
import type { StepProps } from './StepsA';

export function StepPreview({ mine }: StepProps) {
  const api = useApi();
  const qc = useQueryClient();
  const preview = useQuery({ queryKey: ['preview'], queryFn: () => api.providers.preview() });
  const sub = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine() });
  const [plan, setPlan] = useState<string | null>(null);
  const s = useSubscribe();
  const publish = useMutation({ mutationFn: () => api.providers.publish(), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['my-provider'] }); void qc.invalidateQueries({ queryKey: ['provider-dashboard'] }); } });
  const missing = mine?.missingForPublish ?? [];
  const active = sub.data?.entitled || s.phase === 'active';

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Profile preview" className="overflow-hidden rounded-lg border border-line bg-white pb-6">
        <QueryBoundary query={preview} skeleton={<SkeletonList rows={2} height="h-40" />}>{(p) => <ProfileView p={p} />}</QueryBoundary>
      </section>

      {missing.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-lg bg-warning-bg p-4 text-sm text-warning-fg"><AlertTriangle className="h-5 w-5 flex-none" aria-hidden />
          <div><p className="font-semibold">Complete these before going live</p><ul className="mt-1 list-inside list-disc">{missing.map((m) => <li key={m}>{m}</li>)}</ul></div></div>
      )}

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Choose a plan to go live</h3>
        <p className="text-sm text-subtle">Your profile stays a free draft. A subscription makes you discoverable and lets customers send you new requests. Your plan switches on only after our server confirms your payment.</p>
        {active ? (
          <p className="flex items-center gap-2 rounded-md bg-success-bg p-3 text-sm font-medium text-success-fg"><CheckCircle2 className="h-5 w-5" aria-hidden />Your subscription is active.</p>
        ) : (
          <>
            <PlanPicker value={plan} onChange={setPlan} />
            <div><Button size="lg" disabled={!plan || s.busy} loading={s.busy} onClick={() => plan && void s.run(plan)}>Subscribe with Razorpay</Button></div>
            <SubscribeStatus phase={s.phase} error={s.error} />
            <p className="text-xs text-muted">You will be charged on a recurring basis and can cancel renewal anytime from Subscription and billing. See <Link to="/legal/cancellation-refund">cancellation and refund</Link>.</p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-6">
        {mine?.status === 'PUBLISHED' ? (
          <p className="flex items-center gap-2 text-sm font-medium text-success-fg"><CheckCircle2 className="h-5 w-5" aria-hidden />Your profile is published. <Link to={`/professionals/${mine.slug}`}>View public page</Link></p>
        ) : (
          <>
            <Button size="lg" disabled={missing.length > 0 || !active} loading={publish.isPending} onClick={() => publish.mutate()}>Publish my profile</Button>
            {!active && <p className="text-sm text-subtle">Publishing becomes available once your subscription is active.</p>}
            {publish.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(publish.error)}</p>}
          </>
        )}
      </section>
    </div>
  );
}
