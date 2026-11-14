import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

export function Login() {
  const { admin, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (admin) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email.trim(), password); nav('/', { replace: true }); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-white p-8 shadow-sm" aria-labelledby="login-title">
        <Logo size={36} />
        <h1 id="login-title" className="text-xl font-bold">Sign in</h1>
        {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" variant="primary" loading={busy} className="w-full">{busy ? 'Signing in...' : 'Sign in'}</Button>
        <p className="text-center text-sm"><Link to="/forgot" className="text-teal-700 underline">Forgot password?</Link></p>
      </form>
    </div>
  );
}
