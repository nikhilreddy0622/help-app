import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, errMsg, handleAuthError } from '../lib/api';
import { humanize } from '../lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, TableSkeleton, useActions } from '../components/ui';
import { useAuth } from '../lib/auth';

const ROLES = ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE', 'MODERATOR'];

function CreateAdmin({ onClose }: { onClose: () => void }) {
  const { toast } = useActions();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'SUPPORT' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.name.trim().length >= 2 && /.+@.+\..+/.test(f.email) && f.password.length >= 8;
  const save = async () => {
    setBusy(true);
    try {
      await api.admin.createAdmin({ ...f, name: f.name.trim(), email: f.email.trim() });
      toast('success', 'Admin created');
      await qc.invalidateQueries();
      onClose();
    } catch (e) { handleAuthError(e); toast('error', errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open title="New admin" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={save}>Create admin</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={set('name')} />}</Field>
      <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="off" value={f.email} onChange={set('email')} />}</Field>
      <Field label="Temporary password" hint="At least 8 characters. Share securely.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />}</Field>
      <Field label="Role">{(id) => <Select id={id} value={f.role} onChange={set('role')}>{ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</Select>}</Field>
    </Modal>
  );
}

export function Admins() {
  const { admin } = useAuth();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['admins'], queryFn: () => api.admin.admins().catch((e) => { handleAuthError(e); throw e; }) });
  if (admin?.role !== 'SUPER_ADMIN') return <Card><EmptyState title="Not available" hint="Only super admins can manage admins." /></Card>;
  return (
    <>
      <PageHeader title="Admins" subtitle="Staff with dashboard access" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden />New admin</Button>} />
      <Card>
        {q.isPending ? <TableSkeleton cols={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? <EmptyState title="No admins" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Email</th><th scope="col" className="px-4 py-3">Role</th></tr></thead>
              <tbody className="divide-y divide-line">
                {q.data.map((a) => <tr key={a.id}><td className="px-4 py-3 font-medium">{a.name}</td><td className="px-4 py-3">{a.email}</td><td className="px-4 py-3"><Badge color={a.role === 'SUPER_ADMIN' ? 'teal' : 'slate'}>{humanize(a.role)}</Badge></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <CreateAdmin onClose={() => setOpen(false)} />}
    </>
  );
}
