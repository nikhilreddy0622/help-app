import * as SecureStore from 'expo-secure-store';
import { createApiClient, ApiError } from '@help/api-client';
import type { AuthTokens } from '@help/types';

const KEY = 'help.tokens';
let cache: AuthTokens | null | undefined;
let signedOutHandler: (() => void) | undefined;

export const onSignedOut = (fn: () => void) => { signedOutHandler = fn; };

export const tokenStore = {
  async get(): Promise<AuthTokens | null> {
    if (cache !== undefined) return cache;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      cache = raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch { cache = null; }
    return cache;
  },
  async set(t: AuthTokens | null): Promise<void> {
    cache = t;
    try {
      if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t));
      else await SecureStore.deleteItemAsync(KEY);
    } catch { /* storage unavailable */ }
  },
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api/v1';

export const api = createApiClient({ baseUrl: API_URL, tokens: tokenStore, onSignedOut: () => signedOutHandler?.() });

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const friendly: Record<string, string> = {
      LINK_REQUIRED: 'An account with this email already exists. Sign in with your phone or email code first, then link Google from Settings, Linked accounts.',
      IDENTITY_TAKEN: 'This phone, email or Google account already belongs to another help account.',
      OTP_INVALID: 'That code is not correct. Check it and try again.',
      OTP_EXPIRED: 'That code has expired. Request a new one.',
      OTP_LOCKED: 'Too many wrong attempts. Request a new code.',
      OTP_LIMIT: 'Too many codes requested. Please try again in an hour.',
      OTP_COOLDOWN: 'Please wait a moment before requesting another code.',
    };
    if (friendly[e.code]) return friendly[e.code]!;
  }
  if (e instanceof ApiError) return e.status === 0 || e.code === 'NETWORK' ? 'Could not reach the server. Check your connection.' : e.message;
  if (e instanceof TypeError) return 'Could not reach the server. Check your connection.';
  return e instanceof Error ? e.message : 'Something went wrong';
}

export async function kv(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
export async function setKv(key: string, v: string | null): Promise<void> {
  try { if (v === null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, v); } catch { /* ignore */ }
}
export { ApiError };
