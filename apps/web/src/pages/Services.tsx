import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import { categoriesQuery } from '../lib/queries';
import { useUserLocation } from '../state/LocationContext';
import { Seo } from '../components/ui/Seo';
import { QueryBoundary, SkeletonList } from '../components/ui/States';
import { CategoryIcon } from '../components/provider/CategoryIcon';

export default function Services() {
  const api = useApi();
  const { location } = useUserLocation();
  const q = useQuery(categoriesQuery(api));
  return (
    <div className="container-page py-8">
      <Seo title="All services" description="Browse every service and professional category on help: home services, education, health, photography and more." path="/services" />
      <h1 className="text-3xl font-bold tracking-tight">All services</h1>
      <p className="mt-2 text-subtle">Pick a category to see professionals near you.</p>
      <div className="mt-6">
        <QueryBoundary query={q} skeleton={<SkeletonList rows={4} height="h-28" />} isEmpty={(d) => d.length === 0}>
          {(list) => (
            <div className="grid gap-4 md:grid-cols-2">
              {list.filter((g) => !g.parentId).map((g) => (
                <section key={g.id} className="card p-5" aria-labelledby={`g-${g.slug}`}>
                  <h2 id={`g-${g.slug}`} className="flex items-center gap-2 text-lg font-semibold"><span className="text-teal"><CategoryIcon slug={g.slug} icon={g.icon} /></span>
                    <Link to={`/c/${g.slug}/${location.citySlug}`} style={{ color: '#172B4D' }}>{g.name}</Link></h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {list.filter((s) => s.parentId === g.id).map((s) => (
                      <li key={s.id}><Link to={`/c/${s.slug}/${location.citySlug}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm font-medium hover:bg-surface" style={{ color: '#475569' }}>{s.name}{s.providerCount ? <span className="text-xs text-muted">({s.providerCount})</span> : null}</Link></li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}
