import { api } from '../lib/api';
import { formatINR, get, humanize, num } from '../lib/format';
import { Button, PageHeader, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

const opts = (vals: string[]) => vals.map((v) => ({ value: v, label: humanize(v) }));

export function Subscriptions() {
  const { run } = useActions();
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Provider subscriptions and billing state" />
      <ListView
        id="subscriptions"
        fetcher={(q) => api.admin.subscriptions(q)}
        search="Search provider"
        filters={[{ name: 'status', label: 'Status', options: opts(['ACTIVE', 'PENDING', 'PAST_DUE', 'HALTED', 'CANCELLED', 'EXPIRED']) }]}
        columns={[
          col.name('Provider', 'provider.displayName', 'providerName', 'provider.name', 'displayName'),
          col.text('Plan', 'plan.name', 'planName', 'planCode'),
          col.status(),
          col.money('Price', 'plan.pricePaise', 'pricePaise', 'amountPaise'),
          col.date('Period ends', 'currentPeriodEnd'),
          col.date('Created'),
        ]}
        actions={(r) => (
          <Button size="sm" onClick={() => run({ title: 'Reconcile subscription', description: 'Fetch the latest state from the payment gateway and update this subscription. Entitlement changes only if the gateway confirms it.', confirmLabel: 'Reconcile', success: 'Reconciliation requested' }, () => api.admin.reconcileSubscription(r.id))}>Reconcile</Button>
        )}
      />
    </>
  );
}

const PAID = /^(CAPTURED|PAID|SUCCESS|SUCCEEDED|AUTHORIZED)$/;

export function Payments() {
  return (
    <>
      <PageHeader title="Payments" subtitle="Subscription payments from the gateway" />
      <ListView
        id="payments"
        fetcher={(q) => api.admin.payments(q)}
        search="Search payment or provider"
        filters={[{ name: 'status', label: 'Status', options: opts(['CAPTURED', 'FAILED', 'REFUNDED', 'CREATED']) }]}
        columns={[
          col.text('Payment', 'razorpayPaymentId', 'gatewayPaymentId', 'reference', 'id'),
          col.name('Provider', 'provider.displayName', 'providerName', 'provider.name'),
          col.money(),
          col.status(),
          col.text('Failure reason', 'failureReason', 'errorDescription'),
          col.date('Date'),
        ]}
        footer={(rows) => {
          const paid = rows.filter((r) => PAID.test(String(get(r, 'status')).toUpperCase()));
          const failed = rows.filter((r) => String(get(r, 'status')).toUpperCase() === 'FAILED');
          const sum = (xs: typeof rows) => xs.reduce((a, r) => a + (num(get(r, 'amountPaise', 'amount')) ?? 0), 0);
          return (
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              <span>Collected (loaded rows): <strong className="tabular-nums">{formatINR(sum(paid))}</strong> across {paid.length}</span>
              <span>Failed: <strong className="tabular-nums">{failed.length}</strong> ({formatINR(sum(failed))})</span>
              <span className="text-muted">Totals cover rows loaded so far.</span>
            </div>
          );
        }}
      />
    </>
  );
}
