import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { ProviderCard } from '@help/types';

interface Ctx { items: ProviderCard[]; has: (id: string) => boolean; toggle: (p: ProviderCard) => void; clear: () => void }
const C = createContext<Ctx>({ items: [], has: () => false, toggle: () => undefined, clear: () => undefined });
export const useCompare = () => useContext(C);
export const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ProviderCard[]>([]);
  const toggle = useCallback((p: ProviderCard) => {
    setItems((cur) => {
      if (cur.some((x) => x.id === p.id)) return cur.filter((x) => x.id !== p.id);
      if (cur.length >= MAX_COMPARE) { setTimeout(() => Alert.alert('Compare up to 3', 'Remove one professional to add another.'), 0); return cur; }
      return [...cur, p];
    });
  }, []);
  const v = useMemo<Ctx>(() => ({ items, has: (id) => items.some((x) => x.id === id), toggle, clear: () => setItems([]) }), [items, toggle]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
