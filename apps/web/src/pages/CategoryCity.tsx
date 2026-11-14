import { Link, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import { categoriesQuery, searchInfiniteQuery } from '../lib/queries';
import { cityBySlug, CITIES } from '../lib/cities';
import { listJsonLd, breadcrumbJsonLd } from '../lib/jsonld';
import { useSite } from '../state/SiteContext';
import { Seo } from '../components/ui/Seo';
import { ProviderResults } from '../components/provider/ProviderCard';
import { SectionTitle } from '../components/ui/Bits';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { LinkButton } from '../components/ui/Button';

export default function CategoryCity() {
  const { categorySlug = '', city: citySlug = '' } = useParams();
  const api = useApi();
  const { origin } = useSite();
  const cats = useQuery(categoriesQuery(api));
  const city = cityBySlug(citySlug);
  const cat = cats.data?.find((c) => c.slug === categorySlug);
  const params = { lat: city?.lat ?? 0, lng: city?.lng ?? 0, radiusKm: 25, categoryId: cat?.id, sort: 'relevance' as const };
  const query = useInfiniteQuery({ ...searchInfiniteQuery(api, params), enabled: !!city && !!cat });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (cats.isPending) return <div className="container-page py-10"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-6 h-64 w-full" /></div>;
  if (cats.isError) return <div className="container-page py-10"><ErrorState error={cats.error} onRetry={() => void cats.refetch()} /></div>;
  if (!city || !cat) {
    return (
      <div className="container-page py-10"><Seo title="Page not found" noindex /><EmptyState title="We could not find that page" text="Check the category and city, or search all professionals." action={<LinkButton to="/search">Search professionals</LinkButton>} /></div>
    );
  }
  const name = cat.name;
  const path = `/c/${cat.slug}/${city.slug}`;
  return (
    <div className="container-page py-6 md:py-8">
      <Seo
        title={`${name} in ${city.name}`}
        description={`Find verified ${name.toLowerCase()} in ${city.name}. Compare ratings, prices and availability, then chat or call directly.`}
        path={path}
        jsonLd={[...(items.length ? [listJsonLd(`${name} in ${city.name}`, items, origin)] : []), breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name, path: `/search?category=${cat.slug}` }, { name: city.name, path }], origin)]}
      />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-subtle"><Link to="/">Home</Link> / <span>{name}</span> / <span aria-current="page">{city.name}</span></nav>
      <h1 className="text-3xl font-bold tracking-tight">{name} in {city.name}</h1>
      <p className="mt-2 max-w-2xl text-subtle">Compare verified {name.toLowerCase()} within 25 km of {city.name}. Reviews come only from customers who contacted the professional through help, and phone numbers are shown only on request.</p>
      {(() => {
        const subs = (cats.data ?? []).filter((c) => c.parentId === cat.id);
        return subs.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${name} subcategories`}>{subs.map((c) => (
            <li key={c.id}><Link to={`/c/${c.slug}/${city.slug}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm font-medium hover:bg-surface" style={{ color: '#475569' }}>{c.name}{c.providerCount ? <span className="text-xs text-muted">({c.providerCount})</span> : null}</Link></li>))}
          </ul>
        ) : null;
      })()}
      <div className="mt-6"><ProviderResults query={query} items={items} cols="lg:grid-cols-3" /></div>
      <section className="mt-12"><SectionTitle>{name} in other cities</SectionTitle>
        <ul className="flex flex-wrap gap-2">{CITIES.filter((c) => c.slug !== city.slug).map((c) => <li key={c.slug}><Link className="inline-flex h-9 items-center rounded-full border border-line-strong bg-white px-4 text-sm font-medium" to={`/c/${cat.slug}/${c.slug}`}>{c.name}</Link></li>)}</ul>
      </section>
      {cats.data && cats.data.length > 1 && (
        <section className="mt-10"><SectionTitle>Other services in {city.name}</SectionTitle>
          <ul className="flex flex-wrap gap-2">{cats.data.filter((c) => c.id !== cat.id).map((c) => <li key={c.id}><Link className="inline-flex h-9 items-center rounded-full border border-line-strong bg-white px-4 text-sm font-medium" to={`/c/${c.slug}/${city.slug}`}>{c.name}</Link></li>)}</ul>
        </section>
      )}
    </div>
  );
}
