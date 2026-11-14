/** Tiny in-process TTL cache with in-flight de-duplication (hot, rarely-changing reads). */
export function ttlCache<T>(ttlMs: number, max = 500) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && Date.now() - hit.at < ttlMs) return hit.value;
      if (store.size >= max) store.clear();
      const value = load();
      store.set(key, { at: Date.now(), value });
      value.catch(() => store.delete(key));
      return value;
    },
    clear: () => store.clear(),
  };
}
