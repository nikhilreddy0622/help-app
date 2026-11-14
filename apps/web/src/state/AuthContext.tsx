import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthTokens, Me } from '@help/types';
import { onSignedOutEvent, tokenStore, useApi } from '../lib/api';

type Status = 'loading' | 'anon' | 'authed';
interface AuthValue {
  status: Status;
  me: Me | null;
  signIn: (r: { tokens: AuthTokens; me: Me }) => void;
  signOut: () => Promise<void>;
  setMe: (m: Me) => void;
  refreshMe: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const qc = useQueryClient();
  // Always starts as "loading" so server and first client render match; resolved in an effect.
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMeState] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await tokenStore.get())) { setStatus('anon'); return; }
      try {
        const m = await api.auth.me();
        if (!cancelled) { setMeState(m); setStatus('authed'); }
      } catch {
        if (!cancelled) { setStatus(tokenStore.get() ? 'anon' : 'anon'); }
      }
    })();
    const off = onSignedOutEvent(() => { setMeState(null); setStatus('anon'); qc.clear(); });
    return () => { cancelled = true; off(); };
  }, [api, qc]);

  const signIn = useCallback((r: { tokens: AuthTokens; me: Me }) => {
    tokenStore.set(r.tokens);
    qc.clear();
    setMeState(r.me);
    setStatus('authed');
  }, [qc]);

  const signOut = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* token may already be invalid */ }
    tokenStore.set(null);
    qc.clear();
    setMeState(null);
    setStatus('anon');
  }, [api, qc]);

  const refreshMe = useCallback(async () => { setMeState(await api.auth.me()); }, [api]);

  const value = useMemo<AuthValue>(() => ({ status, me, signIn, signOut, setMe: setMeState, refreshMe }), [status, me, signIn, signOut, refreshMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
