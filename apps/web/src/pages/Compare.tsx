import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { ProviderPublicProfile } from '@help/types';
import { priceUnitLabel } from '@help/ui-tokens';
import { useApi } from '../lib/api';
import { isRedirect, profileQuery } from '../lib/queries';
import { formatINR } from '../lib/format';
import { useCompare } from '../state/CompareContext';
import { Seo } from '../components/ui/Seo';
import { PresencePill } from '../components/ui/Presence';
import { Avatar, Stars, VerificationBadgeRow } from '../components/ui/Bits';
import { EmptyState, ErrorState, SkeletonList } from '../components/ui/States';
import { LinkButton, Button } from '../components/ui/Button';

export default function Compare() {
  const api = useApi();
  const { items, remove, clear } = useCompare();
  const results = useQueries({ queries: items.map((i) => profileQuery(api, i.slug)) });
  const loading = results.some((r) => r.isPending);
  const failed = results.find((r) => r.isError);
  const profiles = results.map((r) => r.data).filter((d): d is ProviderPublicProfile => !!d && !isRedirect(d));

  const rows: [string, (p: ProviderPublicProfile) => React.ReactNode][] = [
    ['Rating', (p) => <Stars value={p.isNew ? null : p.ratingAvg} count={p.ratingCount} />],
    ['Starting price', (p) => (p.startingPricePaise !== null ? `${formatINR(p.startingPricePaise)} ${p.startingPriceUnit ? priceUnitLabel[p.startingPriceUnit] ?? '' : ''}` : 'On request')],
    ['Experience', (p) => `${p.experienceYears} years`],
    ['Member since', (p) => new Date(p.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })],
    ['Reply time', (p) => (p.responseMinutes ? `~${p.responseMinutes} min` : 'Not enough data')],
    ['Distance', (p) => (p.distanceKm !== null ? `${p.distanceKm.toFixed(1)} km` : '—')],
    ['Service radius', (p) => `${p.serviceRadiusKm} km`],
    ['Status', (p) => <PresencePill status={p.status} label={p.statusLabel} />],
    ['Verification', (p) => <VerificationBadgeRow badges={p.badges} />],
    ['Languages', (p) => p.languages.join(', ') || '—'],
    ['Services', (p) => (p.services.length ? <ul className="space-y-0.5">{p.services.slice(0, 4).map((s) => <li key={s.id}>{s.title}</li>)}</ul> : '—')],
  ];

  return (
    <div className="container-page py-8">
      <Seo title="Compare professionals" noindex />
      <div className="mb-5 flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">Compare professionals</h1>{items.length > 0 && <Button variant="secondary" size="sm" onClick={clear}>Clear all</Button>}</div>
      {items.length < 2 ? (
        <EmptyState title="Pick at least two professionals" text="Use the Compare button on search results or your saved list. You can compare up to 3." action={<LinkButton to="/search">Find professionals</LinkButton>} />
      ) : loading ? <SkeletonList rows={3} height="h-16" /> : failed ? <ErrorState error={failed.error} onRetry={() => results.forEach((r) => void r.refetch())} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Side-by-side comparison</caption>
            <thead>
              <tr><td className="w-36 p-4" />
                {profiles.map((p) => (
                  <th key={p.id} scope="col" className="min-w-[200px] border-l border-line p-4 align-top font-normal">
                    <div className="flex items-start gap-3"><Avatar name={p.displayName} src={p.avatarUrl} size={48} />
                      <div className="min-w-0 flex-1"><Link to={`/professionals/${p.slug}`} className="block truncate font-semibold">{p.displayName}</Link><p className="truncate text-xs text-subtle">{p.headline}</p></div>
                      <button type="button" aria-label={`Remove ${p.displayName}`} onClick={() => remove(p.slug)} className="rounded-full p-1.5 text-subtle hover:bg-surface"><X className="h-4 w-4" /></button></div>
                    <LinkButton to={`/professionals/${p.slug}`} size="sm" className="mt-3 w-full">View and contact</LinkButton>
                  </th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {rows.map(([label, cell]) => (
                <tr key={label}><th scope="row" className="p-4 text-xs font-semibold uppercase tracking-wide text-subtle">{label}</th>{profiles.map((p) => <td key={p.id} className="border-l border-line p-4 align-top text-ink">{cell(p)}</td>)}</tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
