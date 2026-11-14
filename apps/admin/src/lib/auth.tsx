import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AdminMe } from '@help/api-client';
import { api, onSignedOut, tokenStorage } from './api';

interface AuthState { admin: AdminMe | null; loading: boolean; login(email: string, password: string): Promise<void>; logout(): void }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStorage.get());
  const nav = useNavigate();
  const qc = useQueryClient();

  const logout = () => { tokenStorage.set(null); setAdmin(null); qc.clear(); nav('/login', { replace: true }); };

  useEffect(() => { onSignedOut(logout); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!tokenStorage.get()) return;
    api.admin.me().then(setAdmin).catch(() => tokenStorage.set(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.admin.login(email, password);
    tokenStorage.set(r.accessToken);
    setAdmin(r.admin);
  };

  return <Ctx.Provider value={{ admin, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthProvider missing');
  return c;
}
