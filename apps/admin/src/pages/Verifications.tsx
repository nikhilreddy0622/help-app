import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { get, humanize, str } from '../lib/format';
import { Badge, Button, Notice, PageHeader, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

type Kind = '' | 'IDENTITY' | 'QUALIFICATION';

const kindOf = (v: unknown): 'IDENTITY' | 'QUALIFICATION' | null => {
  const s = String(v ?? '').toUpperCase();
  return s.includes('IDENT') ? 'IDENTITY' : s.includes('QUAL') ? 'QUALIFICATION' : null;
};

export function Verifications() {
  const [kind, setKind] = useState<Kind>('');
  const { run } = useActions();
  const runDecision = (id: string, decision: 'APPROVE' | 'REJECT', label: string, who: string) =>
    run(
      { title: `${decision === 'APPROVE' ? 'Approve' : 'Reject'} ${label}`, description: `${decision === 'APPROVE' ? 'Approve' : 'Reject'} the ${label} document from ${who}.`, confirmLabel: decision === 'APPROVE' ? 'Approve' : 'Reject', danger: decision === 'REJECT', noteLabel: 'Note to provider', noteRequired: decision === 'REJECT', success: decision === 'APPROVE' ? 'Verification approved' : 'Verification rejected' },
      (n) => api.admin.decideVerification(id, decision, n || undefined),
    );
  const tabs: { v: Kind; label: string }[] = [{ v: '', label: 'All' }, { v: 'IDENTITY', label: 'Identity' }, { v: 'QUALIFICATION', label: 'Qualification' }];
  return (
    <>
      <PageHeader title="Verification queue" subtitle="Review documents submitted by providers" />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Notice tone="blue"><strong>Identity</strong> confirms the person is who they claim to be (government ID matched to their name and photo). Approval grants the Identity badge.</Notice>
        <Notice tone="blue"><strong>Qualification</strong> confirms professional credentials (degree, licence, certificate). Approval grants the Qualification badge. It is independent of identity.</Notice>
      </div>
      <div role="tablist" aria-label="Verification type" className="mb-4 inline-flex rounded border border-line bg-white p-1">
        {tabs.map((t) => (
          <button key={t.label} role="tab" type="button" aria-selected={kind === t.v} onClick={() => setKind(t.v)} className={`rounded px-4 py-1.5 text-sm font-medium ${kind === t.v ? 'bg-navy text-white' : 'text-subtle hover:bg-slate-100'}`}>{t.label}</button>
        ))}
      </div>
      <ListView
        key={kind}
        id="verifications"
        fetcher={(q) => api.admin.verifications(q)}
        fixedParams={{ type: kind || undefined }}
        initialFilters={{ status: 'PENDING' }}
        filters={[{ name: 'status', label: 'Status', options: ['PENDING', 'APPROVED', 'REJECTED'].map((v) => ({ value: v, label: humanize(v) })) }]}
        emptyTitle="Queue is clear"
        columns={[
          { header: 'Type', cell: (r) => { const k = kindOf(get(r, 'type', 'kind', 'documentType', 'category')); return k ? <Badge color={k === 'IDENTITY' ? 'blue' : 'teal'}>{humanize(k)}</Badge> : <Badge>{str(get(r, 'type', 'kind'))}</Badge>; } },
          col.name('Provider', 'provider.displayName', 'providerName', 'displayName', 'name'),
          col.text('Document', 'documentName', 'docType', 'label', 'title'),
          { header: 'File', cell: (r) => { const u = get(r, 'documentUrl', 'fileUrl', 'url', 'document.url', 'previewUrl'); return typeof u === 'string' ? <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand underline">Preview<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only"> (opens in new tab)</span></a> : <span className="text-muted">-</span>; } },
          col.status(), col.date('Submitted'),
        ]}
        actions={(r) => {
          if (get(r, 'status') !== 'PENDING') return null;
          const k = kindOf(get(r, 'type', 'kind', 'documentType', 'category'));
          const label = k ? humanize(k).toLowerCase() : 'verification';
          const who = str(get(r, 'provider.displayName', 'providerName', 'displayName', 'name'));
          return (
            <>
              <Button size="sm" variant="primary" onClick={() => runDecision(r.id, 'APPROVE', label, who)}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => runDecision(r.id, 'REJECT', label, who)}>Reject</Button>
            </>
          );
        }}
      />
    </>
  );
}
