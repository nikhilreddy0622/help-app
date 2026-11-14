import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { api, errMsg, handleAuthError } from '../lib/api';
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, StatusBadge, TableSkeleton, useActions } from '../components/ui';

interface Cat { id: string; name: string; slug: string; icon: string | null; isActive: boolean; sortOrder: number }
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function CategoryForm({ cat, onClose }: { cat: Cat | 'new' | null; onClose: () => void }) {
  const { toast } = useActions();
  const qc = useQueryClient();
  const existing = cat && cat !== 'new' ? cat : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? 0));
  const [busy, setBusy] = useState(false);
  if (!cat) return null;

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: name.trim(), slug: slug.trim(), icon: icon.trim() || undefined, sortOrder: parseInt(sortOrder, 10) || 0 };
      if (existing) await api.admin.updateCategory(existing.id, body);
      else await api.admin.createCategory({ ...body, isActive: true });
      toast('success', existing ? 'Category updated' : 'Category created');
      await qc.invalidateQueries();
      onClose();
    } catch (e) { handleAuthError(e); toast('error', errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open title={existing ? 'Edit category' : 'New category'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={name.trim().length < 2 || !/^[a-z0-9-]{2,60}$/.test(slug)} onClick={save}>Save</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={name} maxLength={60} onChange={(e) => { setName(e.target.value); if (!existing) setSlug(slugify(e.target.value)); }} />}</Field>
      <Field label="Slug" hint="Lowercase letters, numbers and hyphens">{(id) => <Input id={id} value={slug} onChange={(e) => setSlug(e.target.value)} />}</Field>
      <Field label="Icon name (optional)">{(id) => <Input id={id} value={icon} maxLength={40} onChange={(e) => setIcon(e.target.value)} />}</Field>
      <Field label="Sort order" hint="Lower numbers appear first">{(id) => <Input id={id} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />}</Field>
    </Modal>
  );
}

export function Categories() {
  const { run } = useActions();
  const [form, setForm] = useState<Cat | 'new' | null>(null);
  const q = useQuery({ queryKey: ['categories'], queryFn: () => api.admin.categories().catch((e) => { handleAuthError(e); throw e; }) });
  const rows = [...(q.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)) as Cat[];

  const move = (i: number, dir: -1 | 1) => {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    // If equal sortOrder, spread so swap is meaningful.
    const aOrder = b.sortOrder === a.sortOrder ? a.sortOrder + dir : b.sortOrder;
    const bOrder = a.sortOrder;
    run({ title: 'Reorder category', description: `Move ${a.name} ${dir < 0 ? 'above' : 'below'} ${b.name}.`, confirmLabel: 'Move', success: 'Order updated' },
      async () => { await api.admin.updateCategory(a.id, { sortOrder: aOrder }); await api.admin.updateCategory(b.id, { sortOrder: bOrder }); });
  };
  const toggle = (c: Cat) => run(
    { title: c.isActive ? 'Deactivate category' : 'Activate category', description: c.isActive ? `${c.name} will no longer be offered to new providers or shown in browse.` : `${c.name} will become available again.`, confirmLabel: c.isActive ? 'Deactivate' : 'Activate', danger: c.isActive, success: c.isActive ? 'Category deactivated' : 'Category activated' },
    () => api.admin.updateCategory(c.id, { isActive: !c.isActive }),
  );

  return (
    <>
      <PageHeader title="Categories" subtitle="Service categories shown in discovery" actions={<Button variant="primary" onClick={() => setForm('new')}><Plus className="h-4 w-4" aria-hidden />New category</Button>} />
      <Card>
        {q.isPending ? <TableSkeleton cols={5} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : rows.length === 0 ? <EmptyState title="No categories" hint="Create the first category." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr><th scope="col" className="px-4 py-3">Order</th><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Slug</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c, i) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-6 tabular-nums text-muted">{c.sortOrder}</span>
                        <Button size="sm" variant="ghost" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label={`Move ${c.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.slug}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => setForm(c)}>Edit</Button><Button size="sm" variant={c.isActive ? 'danger' : 'secondary'} onClick={() => toggle(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {form && <CategoryForm key={form === 'new' ? 'new' : form.id} cat={form} onClose={() => setForm(null)} />}
    </>
  );
}
