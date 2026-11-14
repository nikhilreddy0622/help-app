import { createApiClient, ApiError } from '@help/api-client';

const KEY = 'help_admin_token';

export const tokenStorage = {
  get(): string | null {
    try { return sessionStorage.getItem(KEY); } catch { return null; }
  },
  set(v: string | null) {
    try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  },
};

let signedOutHandler: () => void = () => {};
export const onSignedOut = (fn: () => void) => { signedOutHandler = fn; };

export const api = createApiClient({
  kind: 'admin',
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  tokens: {
    get: () => { const t = tokenStorage.get(); return t ? { accessToken: t, refreshToken: '', expiresIn: 0 } : null; },
    set: (t) => tokenStorage.set(t?.accessToken ?? null),
  },
  onSignedOut: () => signedOutHandler(),
});

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

/** Call from react-query error paths: routes to login on 401. */
export function handleAuthError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) { tokenStorage.set(null); signedOutHandler(); }
}

export { ApiError };
