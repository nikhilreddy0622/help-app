import { createContext, useContext } from 'react';
import { ApiError, createApiClient, type ApiClient, type TokenStore } from '@help/api-client';
import type { AuthTokens } from '@help/types';
import { API_URL, isBrowser } from './env';

const KEY = 'help.tokens';
let mem: AuthTokens | null = null;

/** Tokens live in localStorage (try/catch: private mode and blocked storage fall back to memory). */
export const tokenStore: TokenStore = {
  get() {
    if (!isBrowser) return null;
    try {
      const v = localStorage.getItem(KEY);
      return v ? (JSON.parse(v) as AuthTokens) : mem;
    } catch {
      return mem;
    }
  },
  set(t) {
    mem = t;
    if (!isBrowser) return;
    try {
      if (t) localStorage.setItem(KEY, JSON.stringify(t));
      else localStorage.removeItem(KEY);
    } catch { /* storage unavailable */ }
  },
};

const signedOutListeners = new Set<() => void>();
export const onSignedOutEvent = (fn: () => void) => { signedOutListeners.add(fn); return () => { signedOutListeners.delete(fn); }; };

export function createBrowserApi(): ApiClient {
  return createApiClient({ baseUrl: API_URL, tokens: tokenStore, onSignedOut: () => signedOutListeners.forEach((f) => f()) });
}
export function createServerApi(baseUrl: string): ApiClient {
  return createApiClient({ baseUrl, tokens: { get: () => null, set: () => undefined } });
}

const ApiContext = createContext<ApiClient | null>(null);
export const ApiProvider = ApiContext.Provider;
export function useApi(): ApiClient {
  const a = useContext(ApiContext);
  if (!a) throw new Error('ApiProvider missing');
  return a;
}
/** Friendly copy for auth/linking errors; falls back to the server message. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const c = e.code;
    if (c === 'LINK_REQUIRED') return 'An account with these details already exists. Sign in with your original method first, then link this one from Settings > Linked accounts.';
    if (c === 'IDENTITY_TAKEN') return 'That phone number, email or Google account already belongs to another account.';
    if (c.startsWith('OTP_')) {
      if (/EXPIRED/.test(c)) return 'That code has expired. Request a new one.';
      if (/INVALID|WRONG|MISMATCH/.test(c)) return 'That code is not correct. Check it and try again.';
      if (/ATTEMPT|LOCK|TOO_MANY|RATE|LIMIT/.test(c)) return 'Too many attempts. Please wait a few minutes before trying again.';
      return 'We could not verify that code. Request a new one and try again.';
    }
    if (e.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (e.code === 'NETWORK') return 'Could not reach the server. Check your connection and try again.';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}
