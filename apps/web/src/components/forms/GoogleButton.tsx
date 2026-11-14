import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../lib/env';
import { loadGoogle } from '../../lib/external';

/** Google Identity Services button. Calls onCredential with the ID token. */
export function GoogleButton({ onCredential, text = 'signin_with' }: { onCredential: (idToken: string) => void; text?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogle().then(() => {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => cb.current(r.credential) });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: Math.min(360, ref.current.clientWidth || 320), text, shape: 'rectangular' });
    }).catch(() => setError('Google sign-in could not be loaded. Use your phone number instead.'));
    return () => { cancelled = true; };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return <p className="rounded-md bg-surface p-3 text-sm text-subtle">Google sign-in is not configured (set VITE_GOOGLE_CLIENT_ID).</p>;
  return <div><div ref={ref} className="flex min-h-[44px] w-full justify-center" />{error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}</div>;
}
