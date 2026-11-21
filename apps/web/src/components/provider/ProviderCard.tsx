import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import type { ProviderCard as Card } from '@help/types';
import { priceUnitLabel, tileColor } from '@help/ui-tokens';
import { formatINR } from '../../lib/format';
import { Tag } from '../ui/Bits';
import { PresencePill } from '../ui/Presence';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { Button } from '../ui/Button';
import { useCompare } from '../../state/CompareContext';

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

/** Green rating badge, or "New". */
export function RatingBadge({ avg, count, showCount = true }: { avg: number | null; count: number; showCount?: boolean }) {
  if (avg == null || count === 0) return <span className="inline-flex h-6 items-center rounded-[6px] bg-accent-soft px-2 text-xs font-bold text-accent-ink">New</span>;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${avg.toFixed(1)} from ${count} reviews`}>
      <span className="inline-flex h-6 items-center gap-1 rounded-[6px] bg-rating px-1.5 text-xs font-bold text-white">{avg.toFixed(1)}<Star className="h-3 w-3 fill-white" aria-hidden /></span>
      {showCount && <span className="text-xs font-medium text-muted">({count})</span>}
    </span>
  );
}

/** Professional's photo, or bold initials on a category colour, with an "available" strip. */
export function ProPhoto({ p, className = '' }: { p: Pick<Card, 'displayName' | 'avatarUrl' | 'availableNow' | 'categoryName'>; className?: string }) {
  const [failed, setFailed] = useState(false);
  const t = tileColor(p.categoryName || p.displayName);
  return (
    <span className={`relative flex flex-none items-center justify-center overflow-hidden ${className}`} style={{ background: t.bg, color: t.fg }}>
      {p.avatarUrl && !failed ? <img src={p.avatarUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <span className="text-3xl font-extrabold">{initials(p.displayName)}</span>}
      {p.availableNow && <span className="absolute inset-x-0 bottom-0 bg-live/90 py-0.5 text-center text-[10px] font-bold tracking-wide text-white">AVAILABLE</span>}
    </span>
  );
}

export function ProviderCardView({ p }: { p: Card }) {
  const cmp = useCompare();
  const on = cmp.has(p.slug);
  const where = [p.distanceKm !== null ? `${p.distanceKm.toFixed(1)} km` : null, p.locality].filter(Boolean).join(' · ');
  return (
    <article className="card tile-press relative flex min-w-0 gap-3 p-3 hover:shadow-md sm:gap-4">
      <ProPhoto p={p} className="h-24 w-24 rounded-md sm:h-28 sm:w-28" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <h3 className="flex items-center gap-1 text-[17px]">
          <Link to={`/professionals/${p.slug}`} className="truncate after:absolute after:inset-0 after:content-['']" style={{ color: '#121722' }}>{p.displayName}</Link>
          {p.badges.identity && <BadgeCheck className="h-4 w-4 flex-none text-brand" aria-label="ID verified" />}
        </h3>
        <div className="flex items-center gap-2"><RatingBadge avg={p.isNew ? null : p.ratingAvg} count={p.ratingCount} />{p.experienceYears ? <span className="text-xs font-medium text-muted">· {p.experienceYears} yrs exp</span> : null}</div>
        <p className="truncate text-sm text-subtle">{p.headline || p.categoryName}</p>
        {where && <p className="flex items-center gap-1 truncate text-xs font-medium text-muted"><MapPin className="h-3.5 w-3.5 flex-none" aria-hidden />{where}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="whitespace-nowrap text-sm text-subtle">{p.startingPricePaise !== null ? <><b className="text-base font-extrabold text-ink">{formatINR(p.startingPricePaise)}</b> {p.startingPriceUnit ? priceUnitLabel[p.startingPriceUnit] ?? '' : ''}</> : 'Price on request'}</span>
          <span className="relative z-10 flex items-center gap-2">
            {p.sponsored && <Tag tone="neutral">Sponsored</Tag>}
            <button type="button" aria-pressed={on} disabled={!on && cmp.full} onClick={() => cmp.toggle({ slug: p.slug, name: p.displayName })} className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold disabled:opacity-50 ${on ? 'border-brand bg-teal-tint text-teal-800' : 'border-line bg-white text-subtle hover:bg-surface'}`}>{on ? 'Added' : 'Compare'}</button>
          </span>
        </div>
        {!p.availableNow && <div className="pt-1"><PresencePill status={p.status} label={p.statusLabel} /></div>}
      </div>
    </article>
  );
}

export function ProviderGridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading results">{Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}</div>;
}

export function ProviderGrid({ items, cols = 'xl:grid-cols-3' }: { items: Card[]; cols?: string }) {
  return <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${cols}`}>{items.map((p) => <ProviderCardView key={p.id} p={p} />)}</div>;
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
