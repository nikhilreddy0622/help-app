import { useEffect, useState } from 'react';
import { OtpRequestSchema, OtpVerifySchema } from '@help/validation';
import type { AuthTokens, Me } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';

/** Phone OTP flow. mode "login" signs in; mode "link" attaches the phone to the current account. */
export function PhoneOtp({ mode, onLogin, onLinked }: { mode: 'login' | 'link'; onLogin?: (r: { tokens: AuthTokens; me: Me }) => void; onLinked?: (me: Me) => void }) {
  const api = useApi();
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = `+91${digits}`;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = async () => {
    const r = OtpRequestSchema.safeParse({ phone });
    if (!r.success) { setError(r.error.issues[0]?.message ?? 'Invalid number'); return; }
    setBusy(true); setError(null);
    try { const res = await api.auth.requestOtp(phone); setSent(true); setWait(res.resendAfterSec || 30); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  };
  const verify = async () => {
    const body = { phone, code, platform: 'web' as const, deviceName: navigator.userAgent.slice(0, 80) };
    const r = OtpVerifySchema.safeParse(body);
    if (!r.success) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError(null);
    try {
      if (mode === 'login') onLogin?.(await api.auth.verifyOtp(body));
      else onLinked?.(await api.auth.linkPhone(phone, code));
    } catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void (sent ? verify() : request()); }} noValidate>
      <div className="flex items-end gap-2">
        <span className="flex h-11 items-center rounded-md border border-line-strong bg-surface px-3 text-[15px] text-subtle" aria-hidden>+91</span>
        <Input className="flex-1" label="Mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={digits} disabled={sent}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" />
      </div>
      {sent && <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} hint={`Sent to +91 ${digits}`} autoFocus />}
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>{sent ? 'Verify and continue' : 'Send code'}</Button>
      {sent && (
        <div className="flex justify-between text-sm">
          <button type="button" className="font-semibold text-teal-700 disabled:text-muted" disabled={wait > 0 || busy} onClick={() => void request()}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
          <button type="button" className="text-subtle underline" onClick={() => { setSent(false); setCode(''); setError(null); }}>Change number</button>
        </div>
      )}
    </form>
  );
}
