import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, Bookmark, ChevronRight, CreditCard, Eye, MessageSquare, Phone, Zap } from 'lucide-react';
import type { SubscriptionDto } from '@help/types';
import { useApi } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { Seo } from '../../components/ui/Seo';
import { StatusCard } from '../../components/provider/StatusCard';
import { LinkButton } from '../../components/ui/Button';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';

export function SubscriptionBanner({ sub }: { sub: SubscriptionDto | null }) {
  let tone = 'bg-info-bg text-info-fg', text: React.ReactNode = '', cta = 'Subscribe';
  if (!sub || sub.status === 'INCOMPLETE') text = 'You are on a free draft. Subscribe to become discoverable and be contacted by customers.';
  else if (sub.status === 'PENDING') { text = 'Your payment is being confirmed by our server. Your plan activates automatically once confirmed.'; cta = 'Subscription'; }
  else if (sub.status === 'PAST_DUE') { tone = 'bg-warning-bg text-warning-fg'; text = <>Your last payment failed. You keep full access during a grace period{sub.graceEndsAt ? <> until <b>{formatDate(sub.graceEndsAt)}</b></> : ''}. Update your payment method to avoid being hidden from search.</>; cta = 'Fix payment'; }
  else if (['CANCELLED', 'EXPIRED', 'HALTED'].includes(sub.status)) { tone = 'bg-danger-bg text-danger'; text = 'Your subscription is not active, so your profile is hidden from search. Your profile, reviews and conversations are safe. Resubscribe to come back.'; cta = 'Resubscribe'; }
  else if (sub.cancelAtPeriodEnd) { tone = 'bg-warning-bg text-warning-fg'; text = <>Renewal is off. You stay active until <b>{formatDate(sub.currentPeriodEnd)}</b>.</>; cta = 'Manage'; }
  else return null;
  return (
    <div className={`flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`} role="status">
      <p className="flex items-start gap-2 text-sm font-medium"><AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />{text}</p>
      <LinkButton to="/pro/subscription" size="sm" variant="secondary" className="flex-none">{cta}</LinkButton>
    </div>
  );
}

export default function Dashboard() {
  const api = useApi();
  const q = useQuery({ queryKey: ['provider-dashboard'], queryFn: () => api.providers.dashboard() });
  return (
    <div className="flex flex-col gap-5">
      <Seo title="Dashboard" noindex />
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <QueryBoundary query={q} skeleton={<SkeletonList rows={3} height="h-28" />}>
        {(d) => (
          <>
            <StatusCard presence={d.presence} />
            <SubscriptionBanner sub={d.subscription} />
            {d.completeness < 100 && (
              <div className="card p-5">
                <div className="flex items-center justify-between"><h2 className="font-semibold">Profile completeness</h2><b>{d.completeness}%</b></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={d.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness"><div className="h-full bg-teal-700" style={{ width: `${d.completeness}%` }} /></div>
                {d.missingForPublish.length > 0 && <ul className="mt-3 list-inside list-disc text-sm text-subtle">{d.missingForPublish.map((m) => <li key={m}>{m}</li>)}</ul>}
                <LinkButton to="/pro/profile" size="sm" variant="secondary" className="mt-3">Finish your profile</LinkButton>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                [<Eye key="v" className="h-5 w-5" />, 'Profile views (30d)', d.profileViews30d],
                [<MessageSquare key="c" className="h-5 w-5" />, 'Chats started (30d)', d.chatsStarted30d],
                [<Phone key="p" className="h-5 w-5" />, 'Phone reveals (30d)', d.phoneReveals30d],
                [<Bookmark key="s" className="h-5 w-5" />, 'Saves (30d)', d.saves30d],
              ].map(([icon, label, value]) => (
                <div key={label as string} className="card p-4"><span className="text-teal">{icon}</span><dd className="mt-2 text-2xl font-bold text-navy">{value as number}</dd><dt className="text-xs text-subtle">{label as string}</dt></div>
              ))}
            </dl>
            <Link to="/pro/live" className="flex items-center gap-3 rounded-xl border border-line bg-navy p-4 text-white">
              <Zap className="h-5 w-5 flex-none" aria-hidden />
              <span className="flex-1"><span className="block font-semibold">Live requests</span><span className="text-sm text-white/70">Customers who need help right now</span></span>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link to="/pro/insights" className="inline-flex items-center gap-1.5 font-semibold"><BarChart3 className="h-4 w-4" aria-hidden />See insights</Link>
              <Link to="/pro/subscription" className="inline-flex items-center gap-1.5 font-semibold"><CreditCard className="h-4 w-4" aria-hidden />Subscription and billing</Link>
              <span className="text-subtle">{d.ratingAvg ? `Rating ${d.ratingAvg.toFixed(1)} (${d.ratingCount})` : 'No reviews yet'}{d.responseRate !== null ? ` · ${Math.round(d.responseRate * 100)}% reply rate` : ''}</span>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
