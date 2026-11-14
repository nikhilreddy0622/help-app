import { useInfiniteQuery } from '@tanstack/react-query';
import type { AdminRow } from '@help/api-client';
import { handleAuthError } from './api';

type Params = Record<string, string | number | boolean | undefined>;
type Fetcher = (q: Params) => Promise<{ items: AdminRow[]; meta: { nextCursor: string | null } }>;

export function useList(key: string, fetcher: Fetcher, params: Params) {
  const q = useInfiniteQuery({
    queryKey: ['list', key, params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try { return await fetcher({ ...params, limit: 25, cursor: pageParam }); } catch (e) { handleAuthError(e); throw e; }
    },
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...q, rows };
}
