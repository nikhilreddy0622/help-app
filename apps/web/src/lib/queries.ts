import type { ApiClient } from '@help/api-client';
import type { DiscoverySearchInput } from '@help/types';
import { cityBySlug, DEFAULT_CITY } from './cities';

export type SearchParams = Partial<DiscoverySearchInput> & { lat: number; lng: number };

export const categoriesQuery = (api: ApiClient) => ({
  queryKey: ['categories'] as const,
  queryFn: () => api.categories.list(),
  staleTime: 5 * 60_000,
});
export const homeQuery = (api: ApiClient, lat: number, lng: number) => ({
  queryKey: ['home', lat, lng] as const,
  queryFn: () => api.discovery.home({ lat, lng }),
  staleTime: 60_000,
});
export const profileQuery = (api: ApiClient, slug: string) => ({
  queryKey: ['profile', slug] as const,
  queryFn: () => api.providers.bySlug(slug),
  staleTime: 60_000,
  retry: false,
});
export const searchInfiniteQuery = (api: ApiClient, params: SearchParams) => ({
  queryKey: ['search', params] as const,
  queryFn: ({ pageParam }: { pageParam: string | undefined }) => api.discovery.search({ ...params, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: { meta: { nextCursor: string | null } }) => last.meta.nextCursor ?? undefined,
  staleTime: 60_000,
});

/** URL query to API search params. Shared by the SSR prefetch and the client page so cache keys match. */
export function parseSearch(sp: URLSearchParams, categoryIdBySlug: (slug: string) => string | undefined, fallback = DEFAULT_CITY): SearchParams {
  const city = cityBySlug(sp.get('city')) ?? fallback;
  const num = (k: string) => { const v = sp.get(k); const n = v === null || v === '' ? NaN : Number(v); return Number.isFinite(n) ? n : undefined; };
  const lat = num('lat') ?? city.lat, lng = num('lng') ?? city.lng;
  const p: SearchParams = { lat, lng, radiusKm: num('radius') ?? 10, sort: (['relevance', 'distance', 'rating', 'price'] as const).find((s) => s === sp.get('sort')) ?? 'relevance' };
  const q = sp.get('q')?.trim(); if (q) p.q = q;
  const cat = sp.get('category'); const cid = cat ? categoryIdBySlug(cat) : undefined; if (cid) p.categoryId = cid;
  const minRating = num('rating'); if (minRating) p.minRating = minRating;
  const exp = num('exp'); if (exp) p.minExperience = exp;
  const price = num('price'); if (price) p.maxPricePaise = Math.round(price * 100);
  if (sp.get('now') === '1') p.availableNow = true;
  if (sp.get('verified') === '1') p.verifiedOnly = true;
  const lang = sp.get('lang'); if (lang) p.language = lang;
  const mode = sp.get('mode'); if (mode === 'ONSITE' || mode === 'REMOTE') p.serviceMode = mode;
  return p;
}

export const redirectPath = (to: string) => (to.startsWith('/') ? to : `/professionals/${to}`);
export const isRedirect = (d: unknown): d is { redirectTo: string } => !!d && typeof d === 'object' && 'redirectTo' in d;
