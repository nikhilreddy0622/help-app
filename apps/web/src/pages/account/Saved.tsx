import { useInfiniteQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { useApi } from '../../lib/api';
import { Seo } from '../../components/ui/Seo';
import { LinkButton } from '../../components/ui/Button';
import { ProviderResults } from '../../components/provider/ProviderCard';

export default function Saved() {
  const api = useApi();
  const q = useInfiniteQuery({
    queryKey: ['saved'], queryFn: ({ pageParam }) => api.users.saved({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined, getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div>
      <Seo title="Saved professionals" noindex />
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight"><Bookmark className="h-6 w-6 text-teal" aria-hidden />Saved</h1>
      <ProviderResults query={q} items={items} cols="xl:grid-cols-2" emptyAction={<LinkButton to="/search">Find professionals</LinkButton>} />
    </div>
  );
}
