import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { ProviderCard as Card } from '@help/types';
import { priceUnitLabel } from '@help/ui-tokens';
import { formatINR } from '../../lib/format';
import { Avatar, Stars, Tag, VerificationBadgeRow } from '../ui/Bits';
import { PresenceNote, PresencePill } from '../ui/Presence';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { Button } from '../ui/Button';
import { useCompare } from '../../state/CompareContext';

export function ProviderCardView({ p }: { p: Card }) {
  const cmp = useCompare();
  const on = cmp.has(p.slug);
  return (
    <article className="card relative flex flex-col gap-3 p-4 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={p.displayName} src={p.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            <Link to={`/professionals/${p.slug}`} className="text-navy after:absolute after:inset-0 after:content-['']" style={{ color: '#172B4D' }}>{p.displayName}</Link>
          </h3>
          <p className="truncate text-sm text-ink">{p.headline}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{p.categoryName} · {p.experienceYears} yrs</p>
        </div>
        <Stars value={p.isNew ? null : p.ratingAvg} count={p.ratingCount} size="sm" />
      </div>
      <div className="flex flex-col gap-1"><div><PresencePill status={p.status} label={p.statusLabel} /></div><PresenceNote message={p.statusMessage} updatedAt={p.statusUpdatedAt} /></div>
      <VerificationBadgeRow badges={p.badges} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-subtle">
        {(p.distanceKm !== null || p.locality) && (
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-teal" aria-hidden />{[p.locality, p.distanceKm !== null ? `${p.distanceKm.toFixed(1)} km` : null].filter(Boolean).join(' · ')}</span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-divider pt-3">
        <span className="text-sm text-subtle">
          {p.startingPricePaise !== null ? <>from <b className="text-base text-navy">{formatINR(p.startingPricePaise)}</b> {p.startingPriceUnit ? priceUnitLabel[p.startingPriceUnit] ?? '' : ''}</> : 'Price on request'}
        </span>
        <span className="relative z-10 flex items-center gap-2">
          {p.sponsored && <Tag tone="neutral">Sponsored</Tag>}
          <button type="button" aria-pressed={on} disabled={!on && cmp.full} onClick={() => cmp.toggle({ slug: p.slug, name: p.displayName })} className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-semibold disabled:opacity-50 ${on ? 'border-teal-700 bg-teal-tint text-teal-800' : 'border-line-strong bg-white text-subtle hover:bg-surface'}`}>{on ? 'Added to compare' : 'Compare'}</button>
        </span>
      </div>
    </article>
  );
}

export function ProviderGridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading results">{Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;
}

export function ProviderGrid({ items, cols = 'xl:grid-cols-3' }: { items: Card[]; cols?: string }) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${cols}`}>{items.map((p) => <ProviderCardView key={p.id} p={p} />)}</div>;
}

interface ListQ { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }
/** Skeleton / error-with-retry / empty / grid + load more for any paged provider list. */
export function ProviderResults({ query, items, emptyAction, cols }: { query: ListQ; items: Card[]; emptyAction?: React.ReactNode; cols?: string }) {
  if (query.isPending) return <ProviderGridSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} title="We could not load professionals" />;
  if (items.length === 0) return <EmptyState title="No professionals found" text="Try a larger distance, fewer filters, or a different location." action={emptyAction} />;
  return (
    <div className="flex flex-col gap-6">
      <ProviderGrid items={items} cols={cols} />
      {query.hasNextPage && <div className="text-center"><Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Show more</Button></div>}
    </div>
  );
}
