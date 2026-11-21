import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminResetSchema } from '@help/validation';
import { api, errMsg } from '../lib/api';
import { Logo } from '../components/Brand';
import { Button, Card, Field, Input, PageHeader, useActions } from '../components/ui';

const passwordIssue = (pw: string): string | null => {
  const r = AdminResetSchema.shape.password.safeParse(pw);
  return r.success ? null : (r.error.issues[0]?.message ?? 'Invalid password');
};
const RULES = 'At least 10 characters, with a letter and a number.';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-white p-8 shadow-sm">
        <Logo size={36} />
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.admin.forgotPassword(email.trim()); } catch { /* never reveal whether the account exists */ }
    setBusy(false); setDone(true);
  };
  return (
    <Shell title="Forgot password">
      {done ? <p role="status" className="text-sm text-subtle">If an account exists, we've emailed a reset link.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">{(id) => <Input id={id} type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Button type="submit" variant="primary" loading={busy} className="w-full">Send reset link</Button>
        </form>
      )}
      <p className="text-center text-sm"><Link to="/login" className="text-brand underline">Back to sign in</Link></p>
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const issue = pw ? passwordIssue(pw) : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (token.length < 20) { setError('This reset link is invalid. Request a new one.'); return; }
    setBusy(true);
    try { await api.admin.resetPassword(token, pw); setDone(true); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Set a new password">
      {done ? <p role="status" className="text-sm text-subtle">Your password has been updated. You can now sign in.</p> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
          <Field label="New password" hint={issue ?? RULES}>{(id) => <Input id={id} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
          <Field label="Confirm password" hint={confirm && confirm !== pw ? 'Passwords do not match' : undefined}>{(id) => <Input id={id} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
          <Button type="submit" variant="primary" loading={busy} disabled={!pw || !!issue || pw !== confirm} className="w-full">Update password</Button>
        </form>
      )}
      <p className="text-center text-sm"><Link to="/login" className="text-brand underline">Back to sign in</Link></p>
    </Shell>
  );
}

export function ChangePassword() {
  const { toast } = useActions();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const issue = pw ? passwordIssue(pw) : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.changePassword(cur, pw);
      toast('success', 'Password changed');
      setCur(''); setPw(''); setConfirm('');
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Change password" subtitle="Use a password you do not use elsewhere" />
      <Card className="max-w-md p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
          <Field label="New password" hint={issue ?? RULES}>{(id) => <Input id={id} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
          <Field label="Confirm new password" hint={confirm && confirm !== pw ? 'Passwords do not match' : undefined}>{(id) => <Input id={id} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
          <Button type="submit" variant="primary" loading={busy} disabled={!cur || !pw || !!issue || pw !== confirm}>Change password</Button>
        </form>
      </Card>
    </>
  );
}
