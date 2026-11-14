import { useRouter } from 'expo-router';
import { useSession } from './session';

export function useFinishAuth() {
  const router = useRouter();
  const { signIn } = useSession();
  return async (tokens: Parameters<typeof signIn>[0], me: Parameters<typeof signIn>[1]) => {
    await signIn(tokens, me);
    try { router.dismissAll(); } catch { /* single screen stack */ }
    router.replace('/');
  };
}
