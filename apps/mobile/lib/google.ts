import { Platform } from 'react-native';

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const NEEDS_BUILD = 'Google sign-in needs a development build. Use your phone number to continue in Expo Go.';

/** Returns an ID token, or throws a readable Error when Google sign-in is unavailable (Expo Go / not configured). */
export async function googleIdToken(): Promise<string> {
  let mod: typeof import('@react-native-google-signin/google-signin');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@react-native-google-signin/google-signin');
  } catch {
    throw new Error(NEEDS_BUILD);
  }
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error('Google sign-in is not configured yet (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
  try {
    mod.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['email', 'profile'] });
    if (Platform.OS === 'android') await mod.GoogleSignin.hasPlayServices();
    const res = await mod.GoogleSignin.signIn();
    const token = (res as { data?: { idToken?: string | null } }).data?.idToken;
    if (!token) throw new Error('Google sign-in was cancelled.');
    return token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/native module|TurboModule|not found/i.test(msg)) throw new Error(NEEDS_BUILD);
    throw e instanceof Error ? e : new Error('Google sign-in failed.');
  }
}
