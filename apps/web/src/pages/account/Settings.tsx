import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdateMeSchema } from '@help/validation';
import { errorMessage, useApi } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAuth } from '../../state/AuthContext';
import { Seo } from '../../components/ui/Seo';
import { Button } from '../../components/ui/Button';
import { Input, Select, fieldErrors } from '../../components/ui/Field';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';
import { GoogleButton } from '../../components/forms/GoogleButton';
import { PhoneOtp } from '../../components/forms/PhoneOtp';
import { EmailOtp } from '../../components/forms/EmailOtp';
import { Modal } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/Bits';
import NotificationSettings from './NotificationSettings';

function ProfileForm() {
  const api = useApi();
  const { me, setMe } = useAuth();
  const [f, setF] = useState({ name: me?.name ?? '', email: me?.email ?? '', city: me?.city ?? '', preferredLanguage: me?.preferredLanguage ?? 'en' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: () => api.users.updateMe({ name: f.name || undefined, email: f.email || undefined, city: f.city || undefined, preferredLanguage: f.preferredLanguage }), onSuccess: setMe });
  return (
    <form className="card flex max-w-xl flex-col gap-4 p-5" noValidate onSubmit={(e) => {
      e.preventDefault();
      const errs = fieldErrors(UpdateMeSchema, { name: f.name || undefined, email: f.email || undefined, city: f.city || undefined, preferredLanguage: f.preferredLanguage });
      setErrors(errs); if (!Object.keys(errs).length) m.mutate();
    }}>
      <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} autoComplete="name" />
      <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} autoComplete="email" />
      <Input label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} error={errors.city} />
      <Select label="Language" value={f.preferredLanguage} onChange={(e) => setF({ ...f, preferredLanguage: e.target.value })}>
        {[['en', 'English'], ['hi', 'Hindi'], ['kn', 'Kannada'], ['ta', 'Tamil'], ['te', 'Telugu']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
      {m.isSuccess && <p role="status" className="text-sm font-medium text-success-fg">Saved.</p>}
      <div><Button type="submit" loading={m.isPending}>Save changes</Button></div>
    </form>
  );
}

function Linked() {
  const api = useApi();
  const { me, setMe } = useAuth();
  const [modal, setModal] = useState<'phone' | 'email' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!me) return null;
  const row = (title: string, text: string, right: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="font-semibold">{title}</p><p className="truncate text-sm text-subtle">{text}</p></div><div className="flex-none">{right}</div></div>
  );
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="card divide-y divide-divider">
        {row('Google', me.linked.google ? 'Linked' : 'Sign in faster with your Google account',
          me.linked.google ? <Tag tone="success">Linked</Tag> : <div className="w-48"><GoogleButton text="continue_with" onCredential={async (t) => { setErr(null); try { setMe(await api.auth.linkGoogle(t)); } catch (e) { setErr(errorMessage(e)); } }} /></div>)}
        {row('Email', me.email ? `${me.email}${me.emailVerified ? '' : ' (not verified)'}` : 'Add an email to recover your account',
          me.linked.email && me.emailVerified ? <Button variant="secondary" size="sm" onClick={() => setModal('email')}>Change</Button> : <Button variant="secondary" size="sm" onClick={() => setModal('email')}>{me.email ? 'Verify' : 'Link email'}</Button>)}
        {row('Phone number', me.linked.phone ? me.phone ?? 'Linked' : 'Add a verified mobile number',
          <Button variant="secondary" size="sm" onClick={() => setModal('phone')}>{me.linked.phone ? 'Change number' : 'Link phone'}</Button>)}
      </div>
      {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      <p className="text-sm text-subtle">Lost access to your phone? Sign in with your email or Google account, then link a new phone number here.</p>
      <Modal open={modal === 'phone'} onClose={() => setModal(null)} title={me.linked.phone ? 'Change your phone number' : 'Link your phone'}><PhoneOtp mode="link" onLinked={(m) => { setMe(m); setModal(null); }} /></Modal>
      <Modal open={modal === 'email'} onClose={() => setModal(null)} title={me.email ? 'Verify or change your email' : 'Link your email'}><EmailOtp mode="link" onLinked={(m) => { setMe(m); setModal(null); }} /></Modal>
    </div>
  );
}

function Sessions() {
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['sessions'], queryFn: () => api.auth.sessions() });
  const revoke = useMutation({ mutationFn: (id: string) => api.auth.revokeSession(id), onSuccess: () => void qc.invalidateQueries({ queryKey: ['sessions'] }) });
  return (
    <QueryBoundary query={q} skeleton={<SkeletonList rows={2} height="h-16" />}>
      {(list) => (
        <ul className="card max-w-xl divide-y divide-divider">
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="truncate font-medium">{s.deviceName ?? s.platform}{s.current && <span className="ml-2"><Tag tone="info">This device</Tag></span>}</p><p className="text-xs text-subtle">Last active {formatDateTime(s.lastUsedAt)}</p></div>
              {!s.current && <Button variant="secondary" size="sm" loading={revoke.isPending && revoke.variables === s.id} onClick={() => revoke.mutate(s.id)}>Sign out</Button>}
            </li>
          ))}
        </ul>
      )}
    </QueryBoundary>
  );
}

function DataPrivacy() {
  const api = useApi();
  const { signOut, me } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [confirm, setConfirm] = useState('');
  const exp = useMutation({
    mutationFn: () => api.users.exportMe(),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'my-help-data.json'; a.click(); URL.revokeObjectURL(url);
    },
  });
  const del = useMutation({ mutationFn: () => api.users.deleteMe(), onSuccess: async () => { await signOut(); nav('/', { replace: true }); } });
  const close = () => { setOpen(false); setUnderstood(false); setConfirm(''); };
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="card p-5"><h2 className="font-semibold">Export your data</h2><p className="mt-1 text-sm text-subtle">Download a copy of your personal data as a JSON file.</p>
        <Button className="mt-3" variant="secondary" loading={exp.isPending} onClick={() => exp.mutate()}>Download my data</Button>{exp.isError && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(exp.error)}</p>}</div>
      <div className="card border-danger/30 p-5"><h2 className="font-semibold text-danger">Delete account</h2><p className="mt-1 text-sm text-subtle">Permanently deletes your account and personal data. Read what happens before you continue.</p>
        <Button className="mt-3" variant="danger" onClick={() => setOpen(true)}>Delete my account</Button></div>
      <Modal open={open} onClose={close} title="Delete your account?" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Keep account</Button><Button variant="danger" disabled={!understood || confirm !== 'DELETE'} loading={del.isPending} onClick={() => del.mutate()}>Delete permanently</Button></div>}>
        <p className="text-sm font-semibold text-navy">What will happen</p>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-ink">
          <li>You are signed out on every device and cannot sign in to this account again.</li>
          <li>Your profile details, saved professionals and notification settings are deleted.</li>
          <li>Your conversations are removed from your account.</li>
          {me?.hasProviderProfile && <li>Your professional profile is removed from search, and your reviews and listing disappear. Turn off subscription renewal first in <Link to="/pro/subscription">Subscription and billing</Link> so you are not charged again.</li>}
          <li>Some records may be kept where the law requires, such as payment records. [Pending legal review]</li>
          <li>This cannot be undone. Consider <button type="button" className="font-semibold text-teal-700 underline" onClick={() => exp.mutate()}>downloading your data</button> first.</li>
        </ul>
        <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />I understand and want to delete my account.</label>
        <div className="mt-4"><Input label="Type DELETE to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {del.isError && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(del.error)}</p>}
      </Modal>
    </div>
  );
}

const TABS: [string, string][] = [['profile', 'Profile'], ['notifications', 'Notifications'], ['linked', 'Linked accounts'], ['devices', 'Devices'], ['data', 'Data and privacy']];

export default function Settings() {
  return (
    <div>
      <Seo title="Settings" noindex />
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Settings</h1>
      <nav aria-label="Settings sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => `flex-none border-b-2 px-3 py-2.5 text-sm font-semibold ${isActive ? 'border-teal-700 text-navy' : 'border-transparent text-subtle'}`} style={{ color: undefined }}>{l}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfileForm />} />
        <Route path="notifications" element={<NotificationSettings />} />
        <Route path="linked" element={<Linked />} />
        <Route path="devices" element={<Sessions />} />
        <Route path="data" element={<DataPrivacy />} />
      </Routes>
    </div>
  );
}
