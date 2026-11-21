import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { dehydrate, type QueryClient } from '@tanstack/react-query';
import type { Category } from '@help/types';
import { ApiError, type ApiClient } from '@help/api-client';
import { AppProviders, makeQueryClient } from './App';
import { routes } from './routes';
import { createServerApi } from './lib/api';
import { API_URL } from './lib/env';
import { CITIES, cityBySlug, DEFAULT_CITY } from './lib/cities';
import { POSTS, postBySlug } from './content/blog';
import { categoriesQuery, homeQuery, isRedirect, parseSearch, profileQuery, redirectPath, searchInfiniteQuery } from './lib/queries';

export interface RenderOptions { origin: string; apiUrl?: string }
export interface RenderResult { status: number; redirect?: string; html: string; head: string; state: string; ssr: boolean }

interface Outcome { status?: number; redirect?: string }
interface SsrRoute { re: RegExp; prefetch: (qc: QueryClient, api: ApiClient, m: RegExpMatchArray, url: URL) => Promise<Outcome | void> }

const withTimeout = <T,>(p: Promise<T>, ms = 5000) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const quiet = async (fn: () => Promise<unknown>) => { try { await fn(); } catch { /* client will retry */ } };

// Only these public routes are server rendered and indexable.
const SSR_ROUTES: SsrRoute[] = [
  {
    re: /^\/$/,
    prefetch: async (qc, api) => {
      await Promise.all([quiet(() => withTimeout(qc.prefetchQuery(categoriesQuery(api)))), quiet(() => withTimeout(qc.prefetchQuery(homeQuery(api, DEFAULT_CITY.lat, DEFAULT_CITY.lng))))]);
    },
  },
  {
    re: /^\/services\/?$/,
    prefetch: async (qc, api) => { await quiet(() => withTimeout(qc.prefetchQuery(categoriesQuery(api)))); },
  },
  {
    re: /^\/search\/?$/,
    prefetch: async (qc, api, _m, url) => {
      await quiet(() => withTimeout(qc.prefetchQuery(categoriesQuery(api))));
      const cats = qc.getQueryData<Category[]>(categoriesQuery(api).queryKey);
      const params = parseSearch(url.searchParams, (slug) => cats?.find((c) => c.slug === slug)?.id);
      await quiet(() => withTimeout(qc.prefetchInfiniteQuery(searchInfiniteQuery(api, params))));
    },
  },
  {
    re: /^\/c\/([^/]+)\/([^/]+)\/?$/,
    prefetch: async (qc, api, m) => {
      await quiet(() => withTimeout(qc.prefetchQuery(categoriesQuery(api))));
      const cats = qc.getQueryData<Category[]>(categoriesQuery(api).queryKey);
      const cat = cats?.find((c) => c.slug === m[1]);
      const city = cityBySlug(m[2]);
      if (cats && (!cat || !city)) return { status: 404 };
      if (cat && city) await quiet(() => withTimeout(qc.prefetchInfiniteQuery(searchInfiniteQuery(api, { lat: city.lat, lng: city.lng, radiusKm: 25, categoryId: cat.id, sort: 'relevance' }))));
    },
  },
  {
    re: /^\/for-professionals\/?$/,
    prefetch: async (qc, api) => { await quiet(() => withTimeout(qc.prefetchQuery({ queryKey: ['plans'], queryFn: () => api.subscriptions.plans() }))); },
  },
  {
    re: /^\/services\/([^/]+)\/?$/,
    prefetch: async (qc, api, m) => {
      await quiet(() => withTimeout(qc.prefetchQuery(categoriesQuery(api))));
      const cats = qc.getQueryData<Category[]>(categoriesQuery(api).queryKey);
      if (cats && !cats.some((c) => !c.parentId && c.slug === m[1])) return { status: 404 };
    },
  },
  { re: /^\/help\/?$/, prefetch: async () => {} },
  { re: /^\/legal\/([^/]+)\/?$/, prefetch: async () => {} },
  { re: /^\/blog\/?$/, prefetch: async () => {} },
  { re: /^\/blog\/([^/]+)\/?$/, prefetch: async (_qc, _api, m) => (postBySlug(decodeURIComponent(m[1] ?? '')) ? undefined : { status: 404 }) },
  {
    re: /^\/professionals\/([^/]+)\/?$/,
    prefetch: async (qc, api, m) => {
      const slug = decodeURIComponent(m[1] ?? '');
      try {
        const data = await withTimeout(qc.fetchQuery(profileQuery(api, slug)));
        if (isRedirect(data)) return { status: 301, redirect: redirectPath(data.redirectTo) };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return { status: 404 };
      }
    },
  },
];

// Client-rendered areas answer 200 with an empty shell; anything else unknown is a real 404.
const CLIENT_ONLY = /^\/(login|account|pro|notifications|support|compare)(\/|$)/;

const serialize = (v: unknown) => JSON.stringify(v).replace(/</g, '\u003c');
const headString = (h: HelmetServerState) => [h.title, h.meta, h.link, h.script].map((x) => x.toString()).join('\n');

export async function render(url: string, opts: RenderOptions): Promise<RenderResult> {
  const u = new URL(url, opts.origin);
  const pathname = u.pathname;
  const route = SSR_ROUTES.find((r) => r.re.test(pathname));
  const stateOf = (extra: object) => `<script>window.__APP_STATE__=${serialize({ origin: opts.origin, ...extra })}</script>`;

  if (!route) {
    const known = pathname === '/' || CLIENT_ONLY.test(pathname);
    return { status: known ? 200 : 404, html: '', head: '<meta name="robots" content="noindex,nofollow" />', state: stateOf({ ssr: false }), ssr: false };
  }

  const api = createServerApi(opts.apiUrl ?? API_URL);
  const qc = makeQueryClient();
  const outcome = (await route.prefetch(qc, api, pathname.match(route.re) as RegExpMatchArray, u)) ?? {};
  if (outcome.redirect) return { status: 301, redirect: outcome.redirect, html: '', head: '', state: '', ssr: false };

  const handler = createStaticHandler(routes);
  const ctx = await handler.query(new Request(u.href));
  if (ctx instanceof Response) return { status: ctx.status, redirect: ctx.headers.get('Location') ?? '/', html: '', head: '', state: '', ssr: false };
  const router = createStaticRouter(handler.dataRoutes, ctx);
  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <AppProviders qc={qc} api={api} origin={opts.origin}>
        <StaticRouterProvider router={router} context={ctx} hydrate={false} />
      </AppProviders>
    </HelmetProvider>,
  );
  const status = outcome.status ?? ctx.statusCode ?? 200;
  return {
    status, html, ssr: true,
    head: helmetContext.helmet ? headString(helmetContext.helmet) : '',
    state: stateOf({ ssr: true, rq: dehydrate(qc) }),
  };
}

// ---------- sitemap / robots ----------
const staticPaths = ['/', '/search', '/services', '/for-professionals', '/help', '/delete-account', '/blog', ...POSTS.map((p) => `/blog/${p.slug}`), '/legal/terms', '/legal/privacy', '/legal/cancellation-refund', '/legal/grievance'];
let sitemapCache: { at: number; urls: string[] } | null = null;

async function collectUrls(apiUrl: string): Promise<string[]> {
  const api = createServerApi(apiUrl);
  const urls = new Set<string>(staticPaths);
  const cats = await api.categories.list().catch(() => []);
  for (const c of cats) if (!c.parentId) urls.add(`/services/${c.slug}`);
  for (const c of cats) if (c.parentId && (c.providerCount ?? 0) > 0) for (const city of CITIES) urls.add(`/c/${c.slug}/${city.slug}`);
  await Promise.all(CITIES.map(async (city) => {
    let cursor: string | undefined;
    for (let i = 0; i < 5; i++) {
      try {
        const page = await api.discovery.search({ lat: city.lat, lng: city.lng, radiusKm: 50, limit: 50, cursor });
        page.items.forEach((p) => urls.add(`/professionals/${p.slug}`));
        if (!page.meta.nextCursor) break;
        cursor = page.meta.nextCursor;
      } catch { break; }
    }
  }));
  return [...urls].slice(0, 45000);
}

export async function sitemapXml(opts: RenderOptions): Promise<string> {
  if (!sitemapCache || Date.now() - sitemapCache.at > 3_600_000) sitemapCache = { at: Date.now(), urls: await collectUrls(opts.apiUrl ?? API_URL) };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = sitemapCache.urls.map((p) => `  <url><loc>${esc(opts.origin + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function robotsTxt(origin: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /account', 'Disallow: /pro', 'Disallow: /login', 'Disallow: /notifications', 'Disallow: /search?', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}
