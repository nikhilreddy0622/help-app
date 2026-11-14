import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Smartphone } from 'lucide-react';
import { BRAND } from '@help/ui-tokens';
import { useApi, errorMessage } from '../lib/api';
import { useAuth } from '../state/AuthContext';
import { Seo } from '../components/ui/Seo';
import { Logo } from '../components/brand/Brand';
import { GoogleButton } from '../components/forms/GoogleButton';
import { PhoneOtp } from '../components/forms/PhoneOtp';
import { EmailOtp } from '../components/forms/EmailOtp';

export default function Login() {
  const api = useApi();
  const { status, signIn } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  useEffect(() => { if (done) nav(dest, { replace: true }); }, [done, dest, nav]);
  if (status === 'authed' && !done) return <Navigate to={dest} replace />;
  const seg = (on: boolean) => `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold ${on ? 'bg-white text-navy shadow-sm' : 'text-subtle'}`;

  return (
    <div className="container-page flex justify-center py-10 md:py-16">
      <Seo title="Log in or sign up" noindex />
      <div className="card w-full max-w-md p-6 md:p-8">
        <Logo to="/" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Log in or sign up</h1>
        <p className="mt-1 text-sm text-subtle">{BRAND.tagline}. Customers use help for free.</p>
        <div className="mt-6">
          <GoogleButton onCredential={async (idToken) => {
            setError(null);
            try { signIn(await api.auth.google({ idToken, platform: 'web', deviceName: navigator.userAgent.slice(0, 80) })); setDone(true); }
            catch (e) { setError(errorMessage(e)); }
          }} />
          {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
        </div>
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <div role="group" aria-label="Continue with" className="mb-5 flex gap-1 rounded-lg bg-surface p-1">
          <button type="button" aria-pressed={method === 'phone'} className={seg(method === 'phone')} onClick={() => setMethod('phone')}><Smartphone className="h-4 w-4" aria-hidden />Phone</button>
          <button type="button" aria-pressed={method === 'email'} className={seg(method === 'email')} onClick={() => setMethod('email')}><Mail className="h-4 w-4" aria-hidden />Continue with email</button>
        </div>
        {method === 'phone' ? <PhoneOtp mode="login" onLogin={(r) => { signIn(r); setDone(true); }} /> : <EmailOtp mode="login" onLogin={(r) => { signIn(r); setDone(true); }} />}
        <details className="mt-6 rounded-md bg-surface p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-navy">Can&apos;t access your phone?</summary>
          <p className="mt-2 text-subtle">You can still get in. Sign in with your email or Google account instead, then open Settings, Linked accounts and link your new phone number. Your bookings, messages and profile stay on the same account.</p>
        </details>
        <p className="mt-6 text-xs text-muted">By continuing you agree to the <Link to="/legal/terms">Terms</Link> and <Link to="/legal/privacy">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}
