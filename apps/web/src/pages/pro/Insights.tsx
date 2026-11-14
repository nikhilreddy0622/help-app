import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProviderInsights } from '@help/types';
import { useApi } from '../../lib/api';
import { Seo } from '../../components/ui/Seo';
import { Chip } from '../../components/ui/Field';
import { EmptyState, QueryBoundary, SkeletonList } from '../../components/ui/States';

type Key = 'views' | 'chats' | 'phoneReveals' | 'saves';

/** Simple SVG bar chart: one bar per day, accessible via a text summary. */
function BarChart({ data, label }: { data: number[]; label: string }) {
  const W = 600, H = 120, max = Math.max(1, ...data);
  const bw = W / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} role="img" aria-label={`${label}: total ${data.reduce((a, b) => a + b, 0)}, peak ${Math.max(0, ...data)} in a day`} className="h-32 w-full">
      <line x1="0" y1={H} x2={W} y2={H} stroke="#E2E8F0" />
      {data.map((v, i) => {
        const h = Math.round((v / max) * (H - 6));
        return <rect key={i} x={i * bw + bw * 0.15} y={H - h} width={Math.max(1, bw * 0.7)} height={h} rx="1.5" fill="#0F766E" />;
      })}
    </svg>
  );
}

function Body({ d }: { d: ProviderInsights }) {
  const tiles: [string, number, Key][] = [['Profile views', d.totals.views, 'views'], ['Chats started', d.totals.chats, 'chats'], ['Phone reveals', d.totals.phoneReveals, 'phoneReveals'], ['Saves', d.totals.saves, 'saves']];
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card p-4"><dd className="text-2xl font-bold text-navy">{d.totals.impressions}</dd><dt className="text-xs text-subtle">Search appearances</dt></div>
        {tiles.map(([l, v]) => <div key={l} className="card p-4"><dd className="text-2xl font-bold text-navy">{v}</dd><dt className="text-xs text-subtle">{l}</dt></div>)}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        {tiles.map(([l, , k]) => (
          <section key={k} className="card p-4"><h2 className="mb-2 text-sm font-semibold">{l} per day</h2><BarChart label={l} data={d.series.map((s) => s[k])} />
            <div className="flex justify-between text-xs text-muted"><span>{d.series[0]?.day}</span><span>{d.series[d.series.length - 1]?.day}</span></div></section>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="font-semibold">Responsiveness</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3"><div><dd className="text-2xl font-bold text-navy">{d.responseRate !== null ? `${Math.round(d.responseRate * 100)}%` : '—'}</dd><dt className="text-xs text-subtle">Chats answered within 24h</dt></div>
            <div><dd className="text-2xl font-bold text-navy">{d.responseMinutes !== null ? `${d.responseMinutes} min` : '—'}</dd><dt className="text-xs text-subtle">Median first reply</dt></div></dl></section>
        <section className="card p-5"><h2 className="font-semibold">Top search terms</h2>
          {d.topSearchTerms.length === 0 ? <p className="mt-2 text-sm text-subtle">Not enough data yet.</p> : (
            <ol className="mt-3 divide-y divide-divider text-sm">{d.topSearchTerms.map((t) => <li key={t.term} className="flex justify-between py-2"><span>{t.term}</span><span className="text-subtle">{t.count}</span></li>)}</ol>)}</section>
      </div>
    </div>
  );
}

export default function Insights() {
  const api = useApi();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const q = useQuery({ queryKey: ['insights', days], queryFn: () => api.providers.insights(days) });
  return (
    <div>
      <Seo title="Insights" noindex />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <div role="group" aria-label="Period" className="flex gap-2">{([7, 30, 90] as const).map((d) => <Chip key={d} active={days === d} onClick={() => setDays(d)}>{d} days</Chip>)}</div>
      </div>
      <QueryBoundary query={q} skeleton={<SkeletonList rows={3} height="h-32" />} isEmpty={(d) => d.series.length === 0} empty={<EmptyState title="No data yet" text="Insights appear once customers start viewing your profile." />}>
        {(d) => <Body d={d} />}
      </QueryBoundary>
    </div>
  );
}
