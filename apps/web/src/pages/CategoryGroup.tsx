import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search } from 'lucide-react';
import type { Category } from '@help/types';
import { tileColor } from '@help/ui-tokens';
import { useApi } from '../lib/api';
import { categoriesQuery } from '../lib/queries';
import { breadcrumbJsonLd } from '../lib/jsonld';
import { useSite } from '../state/SiteContext';
import { useUserLocation } from '../state/LocationContext';
import { Seo } from '../components/ui/Seo';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { LinkButton } from '../components/ui/Button';
import { CategoryIcon } from '../components/provider/CategoryIcon';

/** Step 1 of browsing: a main category's services, grouped by heading. Each service lists its professionals. */
export default function CategoryGroup() {
  const { group: slug = '' } = useParams();
  const api = useApi();
  const { origin } = useSite();
  const { location } = useUserLocation();
  const cats = useQuery(categoriesQuery(api));
  const [term, setTerm] = useState('');
  const group = cats.data?.find((c) => c.slug === slug && !c.parentId);
  const services = useMemo(() => (cats.data ?? []).filter((c) => group && c.parentId === group.id), [cats.data, group]);
  const sections = useMemo(() => {
    const t = term.trim().toLowerCase();
    const m = new Map<string, Category[]>();
    for (const s of services) {
      if (t && !s.name.toLowerCase().includes(t) && !s.keywords?.some((k) => k.toLowerCase().includes(t))) continue;
      const k = s.subgroup ?? 'Services';
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [services, term]);

  if (cats.isPending) return <div className="container-page py-10"><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="mt-6 h-64 w-full" /></div>;
  if (cats.isError) return <div className="container-page py-10"><ErrorState error={cats.error} onRetry={() => void cats.refetch()} /></div>;
  if (!group) return <div className="container-page py-10"><Seo title="Category not found" noindex /><EmptyState title="We could not find that category" action={<LinkButton to="/services">See all services</LinkButton>} /></div>;

  const t = tileColor(group.slug);
  return (
    <div className="pb-12">
      <Seo title={`${group.name} services near you`} description={`${services.length} ${group.name.toLowerCase()} services on help: ${services.slice(0, 6).map((s) => s.name.toLowerCase()).join(', ')} and more. Compare local professionals and contact them directly.`}
        path={`/services/${group.slug}`} jsonLd={[breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: group.name, path: `/services/${group.slug}` }], origin)]} />
      <section style={{ background: t.bg }} className="rounded-b-xl">
        <div className="container-page flex items-center gap-6 py-8 md:py-12">
          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="mb-3 text-sm font-medium" style={{ color: t.fg }}><Link to="/" style={{ color: t.fg }}>Home</Link> / <Link to="/services" style={{ color: t.fg }}>Services</Link></nav>
            <h1 className="text-3xl md:text-5xl">{group.name}</h1>
            <p className="mt-2 font-semibold" style={{ color: t.fg }}>{services.length} services{group.providerCount ? ` · ${group.providerCount} professionals` : ''}</p>
            {services.length > 8 && (
              <label className="mt-5 flex h-12 max-w-md items-center gap-2 rounded-md bg-white px-4 shadow-sm">
                <Search className="h-5 w-5" style={{ color: t.fg }} aria-hidden />
                <span className="sr-only">Search in {group.name}</span>
                <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search in ${group.name}`} className="h-full w-full border-0 bg-transparent font-medium focus-visible:ring-0 focus-visible:ring-offset-0" />
              </label>
            )}
          </div>
          <span className="hidden h-28 w-28 flex-none items-center justify-center rounded-xl bg-white/75 sm:flex" style={{ color: t.fg }}><CategoryIcon slug={group.slug} icon={group.icon} className="h-14 w-14" /></span>
        </div>
      </section>
      <div className="container-page mt-8 grid gap-6 md:grid-cols-2">
        {sections.length === 0 ? <EmptyState title="No matching services" text="Try a different word." /> : sections.map(([heading, list]) => (
          <section key={heading} aria-labelledby={`h-${heading}`}>
            {sections.length > 1 && <h2 id={`h-${heading}`} className="mb-3 text-lg">{heading}</h2>}
            <ul className="card divide-y divide-divider overflow-hidden">
              {list.map((s) => (
                <li key={s.id}>
                  <Link to={`/c/${s.slug}/${location.citySlug}`} className="flex min-h-[56px] items-center gap-3 px-5 font-semibold hover:bg-surface" style={{ color: '#121722' }}>
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: t.fg, opacity: 0.6 }} aria-hidden />
                    <span className="flex-1">{s.name}</span>
                    {s.providerCount ? <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-fg">{s.providerCount} pro{s.providerCount === 1 ? '' : 's'}</span> : null}
                    <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
