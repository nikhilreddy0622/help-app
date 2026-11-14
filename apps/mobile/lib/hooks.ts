import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paged } from '@help/api-client';
import type { ProviderCard } from '@help/types';
import { api, errorMessage } from './api';
import { useSession } from './session';

/** Saved professionals with an optimistic toggle. Prompts sign-in when signed out. */
export function useSaved() {
  const { signedIn, requireAuth } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['saved'], queryFn: () => api.users.saved(), enabled: signedIn });
  const ids = new Set((q.data?.items ?? []).map((p) => p.id));
  const m = useMutation({
    mutationFn: async (p: { id: string; saved: boolean }) => (p.saved ? api.users.unsave(p.id) : api.users.save(p.id)),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ['saved'] });
      const prev = qc.getQueryData<Paged<ProviderCard>>(['saved']);
      if (prev && p.saved) qc.setQueryData<Paged<ProviderCard>>(['saved'], { ...prev, items: prev.items.filter((x) => x.id !== p.id) });
      return { prev };
    },
    onError: (e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(['saved'], ctx.prev); Alert.alert('Could not update saved', errorMessage(e)); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['saved'] }),
  });
  const toggle = useCallback((id: string) => {
    if (!requireAuth()) return;
    m.mutate({ id, saved: ids.has(id) });
  }, [requireAuth, m, ids]);
  return { query: q, isSaved: (id: string) => ids.has(id), toggle };
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.categories.list(), staleTime: 10 * 60_000 });
}
