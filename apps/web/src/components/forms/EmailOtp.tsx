import { useEffect, useState } from 'react';
import { z } from '@help/validation';
import type { AuthTokens, Me } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';

const emailSchema = z.string().trim().email('Enter a valid email address');

/** Email OTP. mode "login" signs in or signs up; mode "link" verifies and attaches the email to the account. */
export function EmailOtp({ mode, onLogin, onLinked }: { mode: 'login' | 'link'; onLogin?: (r: { tokens: AuthTokens; me: Me }) => void; onLinked?: (me: Me) => void }) {
  const api = useApi();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = async () => {
    const r = emailSchema.safeParse(email);
    if (!r.success) { setError(r.error.issues[0]?.message ?? 'Invalid email'); return; }
    setBusy(true); setError(null);
    try { const res = await api.auth.requestEmailOtp(r.data); setSent(true); setWait(res.resendAfterSec || 30); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  };
  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError(null);
    try {
      const addr = email.trim();
      if (mode === 'login') onLogin?.(await api.auth.verifyEmailOtp({ email: addr, code, platform: 'web', deviceName: navigator.userAgent.slice(0, 80) }));
      else onLinked?.(await api.auth.linkEmail(addr, code));
    } catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void (sent ? verify() : request()); }} noValidate>
      <Input label="Email address" type="email" autoComplete="email" value={email} disabled={sent} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      {sent && <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} hint={`We sent a code to ${email.trim()}`} autoFocus />}
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>{sent ? 'Verify and continue' : 'Send code'}</Button>
      {sent && (
        <div className="flex justify-between text-sm">
          <button type="button" className="font-semibold text-teal-700 disabled:text-muted" disabled={wait > 0 || busy} onClick={() => void request()}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
          <button type="button" className="text-subtle underline" onClick={() => { setSent(false); setCode(''); setError(null); }}>Change email</button>
        </div>
      )}
    </form>
  );
}
