import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useApi } from '../../lib/api';
import { Seo } from '../../components/ui/Seo';
import { LinkButton } from '../../components/ui/Button';
import { EmptyState, QueryBoundary } from '../../components/ui/States';
import { ProviderGrid, ProviderGridSkeleton } from '../../components/provider/ProviderCard';

export default function RecentlyViewed() {
  const api = useApi();
  const q = useQuery({ queryKey: ['recently-viewed'], queryFn: () => api.users.recentlyViewed() });
  return (
    <div>
      <Seo title="Recently viewed" noindex />
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight"><History className="h-6 w-6 text-teal" aria-hidden />Recently viewed</h1>
      <QueryBoundary query={q} skeleton={<ProviderGridSkeleton count={4} />} isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="Nothing viewed yet" text="Professionals you open will show up here so you can find them again." action={<LinkButton to="/search">Find professionals</LinkButton>} />}>
        {(items) => <ProviderGrid items={items} cols="xl:grid-cols-2" />}
      </QueryBoundary>
    </div>
  );
}
