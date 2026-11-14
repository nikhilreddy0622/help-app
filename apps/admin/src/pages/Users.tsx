import { api } from '../lib/api';
import { get } from '../lib/format';
import { Button, PageHeader, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

export function Users() {
  const { run } = useActions();
  return (
    <>
      <PageHeader title="Users" subtitle="Customers and provider accounts" />
      <ListView
        id="users"
        fetcher={(q) => api.admin.users(q)}
        search="Search name, email or phone"
        filters={[
          { name: 'status', label: 'Status', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }] },
          { name: 'role', label: 'Role', options: [{ value: 'CUSTOMER', label: 'Customer' }, { value: 'PROVIDER', label: 'Provider' }] },
        ]}
        columns={[col.name(), col.contact(), col.text('Role', 'role'), col.status(), col.date('Joined')]}
        actions={(r) => {
          const suspended = get(r, 'status') === 'SUSPENDED';
          const name = String(get(r, 'name', 'email') ?? 'this user');
          return suspended ? (
            <Button size="sm" onClick={() => run({ title: 'Reactivate user', description: `Reactivate ${name}? They will be able to sign in again.`, confirmLabel: 'Reactivate', noteLabel: 'Reason', success: 'User reactivated' }, (n) => api.admin.setUserStatus(r.id, 'ACTIVE', n || undefined))}>Reactivate</Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => run({ title: 'Suspend user', description: `Suspend ${name}? They will be signed out and blocked.`, confirmLabel: 'Suspend', danger: true, noteLabel: 'Reason', noteRequired: true, success: 'User suspended' }, (n) => api.admin.setUserStatus(r.id, 'SUSPENDED', n))}>Suspend</Button>
          );
        }}
      />
    </>
  );
}
