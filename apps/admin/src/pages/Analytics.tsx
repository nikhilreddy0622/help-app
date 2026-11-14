import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colors } from '@help/ui-tokens';
import { api, handleAuthError } from '../lib/api';
import { formatINR } from '../lib/format';
import { Card, ErrorState, PageHeader, Select, Skeleton } from '../components/ui';

const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="p-4"><h2 className="mb-3 font-semibold">{title}</h2><div className="h-64">{children}</div></Card>;
}

export function Analytics() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['analytics', days], queryFn: () => api.admin.analytics({ days }).catch((e) => { handleAuthError(e); throw e; }) });
  const series = (q.data?.series ?? []).map((s) => ({ ...s, label: day(s.day), revenue: s.revenuePaise / 100 }));
  const f = q.data?.funnel;
  const funnel = f ? [
    { step: 'Searches', value: f.searches }, { step: 'Profile views', value: f.profileViews }, { step: 'Contacts', value: f.contacts },
    { step: 'Chats replied', value: f.chatsReplied }, { step: 'Reviews', value: f.reviews },
  ] : [];
  const axis = { stroke: colors.textMuted, fontSize: 12 };

  return (
    <>
      <PageHeader
        title="Analytics" subtitle="Growth, demand and revenue"
        actions={<div className="w-40"><Select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select></div>}
      />
      {q.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : q.isError ? <Card><ErrorState error={q.error} onRetry={() => void q.refetch()} /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Signups and chats">
            <ResponsiveContainer><LineChart data={series}><CartesianGrid stroke={colors.border} strokeDasharray="3 3" /><XAxis dataKey="label" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="signups" name="Signups" stroke={colors.teal700} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="chats" name="Chats" stroke={colors.navy} strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Phone reveals">
            <ResponsiveContainer><BarChart data={series}><CartesianGrid stroke={colors.border} strokeDasharray="3 3" /><XAxis dataKey="label" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip />
              <Bar dataKey="phoneReveals" name="Phone reveals" fill={colors.teal700} radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Revenue (INR)">
            <ResponsiveContainer><LineChart data={series}><CartesianGrid stroke={colors.border} strokeDasharray="3 3" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} tickFormatter={(v: number) => `${v}`} /><Tooltip formatter={(v: number) => formatINR(Math.round(v * 100))} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke={colors.teal700} strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Conversion funnel">
            <ResponsiveContainer><BarChart data={funnel} layout="vertical" margin={{ left: 16 }}><CartesianGrid stroke={colors.border} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="step" width={96} {...axis} /><Tooltip />
              <Bar dataKey="value" name="Count" fill={colors.navy} radius={[0, 4, 4, 0]} />
            </BarChart></ResponsiveContainer>
          </ChartCard>
          <Card className="p-4 lg:col-span-2">
            <h2 className="mb-3 font-semibold">Top categories</h2>
            {(q.data?.topCategories.length ?? 0) === 0 ? <p className="text-sm text-muted">No data for this period.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="py-2">Category</th><th scope="col" className="py-2 text-right">Providers</th><th scope="col" className="py-2 text-right">Contacts</th></tr></thead>
                  <tbody className="divide-y divide-line">{q.data!.topCategories.map((c) => <tr key={c.name}><td className="py-2 font-medium">{c.name}</td><td className="py-2 text-right tabular-nums">{c.providers}</td><td className="py-2 text-right tabular-nums">{c.contacts}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
