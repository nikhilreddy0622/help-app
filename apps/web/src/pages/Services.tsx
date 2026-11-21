import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { tileColor } from '@help/ui-tokens';
import { useApi } from '../lib/api';
import { categoriesQuery } from '../lib/queries';
import { Seo } from '../components/ui/Seo';
import { QueryBoundary, SkeletonList } from '../components/ui/States';
import { CategoryIcon } from '../components/provider/CategoryIcon';

export default function Services() {
  const api = useApi();
  const q = useQuery(categoriesQuery(api));
  return (
    <div className="container-page py-8 md:py-12">
      <Seo title="All services" description="Browse 450+ services on help: home repairs, tutors, beauty, health, events, construction, IT and more. Find local professionals near you." path="/services" />
      <h1 className="text-3xl md:text-5xl">All services</h1>
      <p className="mt-2 text-lg text-subtle">Pick a category, then a service, to see professionals near you.</p>
      <div className="mt-8">
        <QueryBoundary query={q} skeleton={<SkeletonList rows={4} height="h-28" />} isEmpty={(d) => d.length === 0}>
          {(list) => (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.filter((g) => !g.parentId).map((g) => {
                const t = tileColor(g.slug);
                const subs = list.filter((s) => s.parentId === g.id);
                return (
                  <li key={g.id}>
                    <Link to={`/services/${g.slug}`} className="card tile-press flex h-full items-start gap-4 p-5 hover:shadow-md" style={{ color: '#121722' }}>
                      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-md" style={{ background: t.bg, color: t.fg }}><CategoryIcon slug={g.slug} icon={g.icon} className="h-7 w-7" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-lg font-extrabold">{g.name}<ChevronRight className="h-4 w-4 text-muted" aria-hidden /></span>
                        <span className="mt-1 line-clamp-2 block text-sm text-subtle">{subs.slice(0, 5).map((s) => s.name).join(' · ')}</span>
                        <span className="mt-2 block text-xs font-semibold" style={{ color: t.fg }}>{subs.length} services</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}
