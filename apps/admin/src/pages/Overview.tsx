import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, handleAuthError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canView, type ModuleKey } from '../lib/roles';
import { formatINR, fmtDate, get, humanize, str } from '../lib/format';
import { Card, ErrorState, PageHeader, Skeleton } from '../components/ui';

export function Overview() {
  const { admin } = useAuth();
  const ov = useQuery({ queryKey: ['overview'], queryFn: () => api.admin.overview().catch((e) => { handleAuthError(e); throw e; }) });
  const showAudit = !!admin && canView(admin.role, 'audit');
  const act = useQuery({ queryKey: ['recent-activity'], enabled: showAudit, queryFn: () => api.admin.auditLogs({ limit: 8 }).catch((e) => { handleAuthError(e); throw e; }) });

  const o = ov.data;
  const n = (v: number | undefined) => v?.toLocaleString('en-IN');
  const cards: { label: string; value: string | undefined; to?: string; module?: ModuleKey; warn?: boolean }[] = [
    { label: 'Users', value: n(o?.users), to: '/users', module: 'users' },
    { label: 'Providers', value: n(o?.providers), to: '/providers', module: 'providers' },
    { label: 'Published providers', value: n(o?.publishedProviders), to: '/providers', module: 'providers' },
    { label: 'Active subscriptions', value: n(o?.activeSubscriptions), to: '/subscriptions', module: 'subscriptions' },
    { label: 'MRR', value: o ? formatINR(o.mrrPaise) : undefined },
    { label: 'Chats (30 days)', value: n(o?.chats30d) },
    { label: 'Open reports', value: n(o?.openReports), to: '/reports', module: 'reports', warn: !!o?.openReports },
    { label: 'Pending verifications', value: n(o?.pendingVerifications), to: '/verifications', module: 'verifications', warn: !!o?.pendingVerifications },
    { label: 'Paused providers', value: n(o?.pausedProviders), to: '/providers', module: 'providers' },
    { label: 'Failed payments (7 days)', value: n(o?.failedPayments7d), to: '/payments', module: 'payments', warn: !!o?.failedPayments7d },
  ];

  return (
    <>
      <PageHeader title="Overview" subtitle="Marketplace health at a glance" />
      {ov.isError ? <Card><ErrorState error={ov.error} onRetry={() => void ov.refetch()} /></Card> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => {
            const inner = (
              <>
                <div className="text-sm text-muted">{c.label}</div>
                {c.value === undefined ? <Skeleton className="mt-2 h-8 w-24" /> : <div className={`mt-1 text-2xl font-bold tabular-nums ${c.warn ? 'text-amber-700' : 'text-ink'}`}>{c.value}</div>}
              </>
            );
            const linkable = c.to && c.module && admin && canView(admin.role, c.module);
            return linkable
              ? <Link key={c.label} to={c.to!} className="rounded-lg border border-line bg-white p-4 shadow-sm hover:border-teal-700">{inner}</Link>
              : <div key={c.label} className="rounded-lg border border-line bg-white p-4 shadow-sm">{inner}</div>;
          })}
        </div>
      )}
      {showAudit && (
        <Card className="mt-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">Recent activity</h2>
            <Link to="/audit-logs" className="text-sm text-teal-700 hover:underline">View all</Link>
          </div>
          {act.isPending ? <div className="space-y-3 p-4"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /></div>
            : act.isError ? <ErrorState error={act.error} onRetry={() => void act.refetch()} />
            : act.data.items.length === 0 ? <p className="p-6 text-center text-sm text-muted">No recent activity.</p>
            : <ul className="divide-y divide-line">
                {act.data.items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span><span className="font-medium">{humanize(str(get(r, 'action')))}</span> <span className="text-muted">{str(get(r, 'entityType', 'entity', 'targetType'))} by {str(get(r, 'admin.name', 'admin.email', 'adminName', 'actor'))}</span></span>
                    <span className="text-xs text-muted">{fmtDate(get(r, 'createdAt'))}</span>
                  </li>
                ))}
              </ul>}
        </Card>
      )}
    </>
  );
}
