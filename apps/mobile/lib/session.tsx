import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthTokens, Me } from '@help/types';
import { api, kv, onSignedOut, setKv, tokenStore } from './api';
import { registerPushIfGranted } from './push';

export type Mode = 'customer' | 'provider';
interface Session {
  ready: boolean;
  me: Me | null;
  mode: Mode;
  signedIn: boolean;
  signIn: (tokens: AuthTokens, me: Me) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setMe: (me: Me) => void;
  switchMode: (m: Mode) => Promise<void>;
  /** Returns true when signed in; otherwise routes to the welcome screen. */
  requireAuth: () => boolean;
}
const Ctx = createContext<Session | null>(null);
export const useSession = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('SessionProvider missing');
  return v;
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMeState] = useState<Me | null>(null);
  const [mode, setModeState] = useState<Mode>('customer');
  const qc = useQueryClient();
  const router = useRouter();

  const clear = useCallback(() => {
    setMeState(null);
    setModeState('customer');
    qc.clear();
  }, [qc]);

  useEffect(() => {
    onSignedOut(() => clear());
    (async () => {
      const savedMode = await kv('help.mode');
      const t = await tokenStore.get();
      if (t) {
        try {
          const m = await api.auth.me();
          setMeState(m);
          if (savedMode === 'provider' && m.hasProviderProfile) setModeState('provider');
          registerPushIfGranted();
        } catch {
          /* offline or expired: stay signed out in UI, tokens kept if only network failed */
        }
      }
      setReady(true);
    })();
  }, [clear]);

  const signIn = useCallback(async (tokens: AuthTokens, m: Me) => {
    await tokenStore.set(tokens);
    setMeState(m);
    registerPushIfGranted();
  }, []);

  const signOut = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    await tokenStore.set(null);
    await setKv('help.mode', null);
    clear();
    router.replace('/');
  }, [clear, router]);

  const refreshMe = useCallback(async () => {
    try { setMeState(await api.auth.me()); } catch { /* ignore */ }
  }, []);

  const switchMode = useCallback(async (m: Mode) => {
    setModeState(m);
    await setKv('help.mode', m);
    router.replace('/');
  }, [router]);

  const requireAuth = useCallback(() => {
    if (me) return true;
    router.push('/auth/welcome');
    return false;
  }, [me, router]);

  const value = useMemo<Session>(() => ({
    ready, me, mode, signedIn: !!me, signIn, signOut, refreshMe, setMe: setMeState, switchMode, requireAuth,
  }), [ready, me, mode, signIn, signOut, refreshMe, switchMode, requireAuth]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
