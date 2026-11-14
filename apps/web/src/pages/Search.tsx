import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Clock, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useApi } from '../lib/api';
import { categoriesQuery, parseSearch, searchInfiniteQuery } from '../lib/queries';
import { cityBySlug, CITIES } from '../lib/cities';
import { useUserLocation } from '../state/LocationContext';
import { Seo } from '../components/ui/Seo';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Field';
import { FiltersPanel } from '../components/provider/FiltersPanel';
import { ProviderResults } from '../components/provider/ProviderCard';
import { LocationPicker } from '../components/provider/LocationPicker';

export default function SearchPage() {
  const api = useApi();
  const [sp, setSp] = useSearchParams();
  const { location } = useUserLocation();
  const [sheet, setSheet] = useState(false);
  const cats = useQuery(categoriesQuery(api));
  const { status } = useAuth();
  const recent = useQuery({ queryKey: ['recent-searches'], enabled: status === 'authed', queryFn: () => api.users.recentSearches() });
  const [term, setTerm] = useState(sp.get('q') ?? '');

  // Without an explicit city/coords in the URL, use the visitor's saved location on the client.
  const effective = useMemo(() => {
    const p = new URLSearchParams(sp);
    if (!p.get('city') && !p.get('lat')) { p.set('city', location.citySlug); p.set('lat', String(location.lat)); p.set('lng', String(location.lng)); }
    return p;
  }, [sp, location]);
  const slugToId = (slug: string) => cats.data?.find((c) => c.slug === slug)?.id;
  const params = useMemo(() => parseSearch(effective, slugToId), [effective, cats.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = useInfiniteQuery(searchInfiniteQuery(api, params));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(effective);
    Object.entries(updates).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setSp(next, { replace: true });
  };
  const reset = () => { const n = new URLSearchParams(); ['q', 'category', 'city', 'lat', 'lng', 'sort'].forEach((k) => { const v = effective.get(k); if (v) n.set(k, v); }); setSp(n, { replace: true }); };

  const activeCat = cats.data?.find((c) => c.slug === sp.get('category'));
  const cityName = (cityBySlug(effective.get('city')) ?? CITIES[0])?.name;
  const title = `${activeCat?.name ?? (sp.get('q') ? `"${sp.get('q')}"` : 'Professionals')} near ${cityName}`;
  const filters = <FiltersPanel sp={effective} set={set} onReset={reset} />;

  return (
    <div className="container-page py-6 md:py-8">
      <Seo title={title} description={`Compare verified ${activeCat?.name?.toLowerCase() ?? 'local professionals'} near ${cityName} by rating, price and availability.`} path="/search" noindex={sp.toString() !== ''} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-subtle" aria-live="polite">{query.isSuccess ? `${items.length}${query.hasNextPage ? '+' : ''} result${items.length === 1 ? '' : 's'}` : ' '}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <LocationPicker className="w-56" />
          <Select label="Sort by" className="w-44" value={effective.get('sort') ?? 'relevance'} onChange={(e) => set({ sort: e.target.value === 'relevance' ? null : e.target.value })}>
            <option value="relevance">Best match</option><option value="distance">Nearest</option><option value="rating">Top rated</option><option value="price">Lowest price</option>
          </Select>
          <Button variant="secondary" className="lg:hidden" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setSheet(true)}>Filters</Button>
        </div>
      </div>
      <form role="search" className="mb-5" onSubmit={(e) => { e.preventDefault(); set({ q: term.trim() || null }); void recent.refetch(); }}>
        <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal" aria-hidden />
          <label htmlFor="s-q" className="sr-only">Search professionals</label>
          <input id="s-q" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by service or name" className="h-12 w-full rounded-lg border border-line-strong bg-white pl-10 pr-24 text-[15px]" />
          <Button type="submit" size="sm" className="absolute right-1.5 top-1.5">Search</Button></div>
        {!sp.get('q') && recent.data && recent.data.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-xs font-semibold text-subtle"><Clock className="h-3.5 w-3.5" aria-hidden />Recent</span>
            {recent.data.slice(0, 6).map((r) => <button key={r.id} type="button" onClick={() => { setTerm(r.query); set({ q: r.query }); }} className="inline-flex h-8 items-center rounded-full border border-line-strong bg-white px-3 text-sm text-subtle hover:bg-surface">{r.query}</button>)}</div>
        )}
      </form>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside aria-label="Filters" className="card hidden h-fit p-5 lg:sticky lg:top-24 lg:block">{filters}</aside>
        <section aria-label="Results" className="min-w-0">
          <ProviderResults query={query} items={items} cols="2xl:grid-cols-3 xl:grid-cols-2" emptyAction={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />
        </section>
      </div>
      <Modal open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button className="w-full" onClick={() => setSheet(false)}>Show results</Button>}>{filters}</Modal>
    </div>
  );
}
