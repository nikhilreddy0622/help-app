import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApi } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { useAuth } from '../../state/AuthContext';
import { Seo } from '../../components/ui/Seo';
import { Logo } from '../../components/brand/Brand';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, QueryBoundary, SkeletonList } from '../../components/ui/States';

/** In-app receipt built from payments.mine. No external invoice link. */
export default function Receipt() {
  const { id = '' } = useParams();
  const api = useApi();
  const { me } = useAuth();
  const q = useQuery({ queryKey: ['payments'], queryFn: () => api.payments.mine() });
  const sub = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscriptions.mine() });
  return (
    <div className="max-w-2xl">
      <Seo title="Receipt" noindex />
      <Link to="/pro/subscription" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold print:hidden"><ArrowLeft className="h-4 w-4" aria-hidden />Subscription and billing</Link>
      <QueryBoundary query={q} skeleton={<SkeletonList rows={1} height="h-64" />}>
        {(list) => {
          const p = list.find((x) => x.id === id);
          if (!p) return <EmptyState title="Receipt not found" action={<LinkButton to="/pro/subscription">Back to billing</LinkButton>} />;
          const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-subtle">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>;
          return (
            <article className="card p-6 md:p-8">
              <div className="flex items-start justify-between gap-4"><Logo to={null} /><div className="text-right"><p className="text-xs uppercase tracking-wide text-subtle">Receipt</p><p className="text-sm font-semibold text-navy">#{p.id.slice(-8).toUpperCase()}</p></div></div>
              <p className="mt-8 text-sm text-subtle">Amount paid</p>
              <p className="text-4xl font-bold tracking-tight text-navy">{formatINR(p.amountPaise)}</p>
              <dl className="mt-6 divide-y divide-divider border-t border-divider">
                {row('Date', formatDate(p.paidAt) || 'Pending')}
                {row('Status', p.status.toLowerCase())}
                {row('Payment method', p.method ?? 'Not available')}
                {sub.data && row('Plan', sub.data.plan.name)}
                {me && row('Billed to', me.name ?? me.email ?? me.phone ?? 'Account holder')}
              </dl>
              <p className="mt-6 text-xs text-muted">Payments are processed by Razorpay.</p>
              <Button variant="secondary" className="mt-6 print:hidden" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print or save as PDF</Button>
            </article>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
