import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CompareItem { slug: string; name: string }
export const MAX_COMPARE = 3;
const KEY = 'help.compare';
interface Value { items: CompareItem[]; has: (slug: string) => boolean; toggle: (i: CompareItem) => void; remove: (slug: string) => void; clear: () => void; full: boolean }
const Ctx = createContext<Value>({ items: [], has: () => false, toggle: () => undefined, remove: () => undefined, clear: () => undefined, full: false });
export const useCompare = () => useContext(Ctx);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  useEffect(() => { try { const v = sessionStorage.getItem(KEY); if (v) setItems(JSON.parse(v) as CompareItem[]); } catch { /* ignore */ } }, []);
  const save = useCallback((next: CompareItem[]) => { setItems(next); try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } }, []);
  const value = useMemo<Value>(() => ({
    items, full: items.length >= MAX_COMPARE,
    has: (s) => items.some((i) => i.slug === s),
    toggle: (i) => save(items.some((x) => x.slug === i.slug) ? items.filter((x) => x.slug !== i.slug) : items.length < MAX_COMPARE ? [...items, i] : items),
    remove: (s) => save(items.filter((i) => i.slug !== s)),
    clear: () => save([]),
  }), [items, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
