import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import type { AdminRow } from '@help/api-client';
import { api, errMsg, handleAuthError } from '../lib/api';
import { fmtDate, humanize } from '../lib/format';
import { Button, Card, ErrorState, PageHeader, Select, Skeleton, StatusBadge, Textarea, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

const STATUSES = ['OPEN', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'] as const;

export function SupportInbox() {
  const nav = useNavigate();
  return (
    <>
      <PageHeader title="Support desk" subtitle="Tickets raised from the help app" />
      <ListView
        id="support"
        fetcher={(q) => api.admin.supportTickets(q).then((r) => r as unknown as { items: AdminRow[]; meta: { nextCursor: string | null } })}
        search="Search subject, ticket number or user"
        initialFilters={{ status: 'OPEN' }}
        filters={[{ name: 'status', label: 'Status', options: STATUSES.map((v) => ({ value: v, label: humanize(v) })) }]}
        columns={[
          col.text('Ticket', 'number'),
          col.text('Subject', 'subject'),
          col.text('User', 'userName'),
          col.text('Category', 'category'),
          col.status(),
          col.date('Last activity', 'lastMessageAt'),
        ]}
        onRowClick={(r) => nav(`/support/${r.id}`)}
        emptyTitle="No tickets"
      />
    </>
  );
}

export function SupportDetail() {
  const { id = '' } = useParams();
  const { run, toast } = useActions();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['support-ticket', id], queryFn: () => api.admin.supportTicket(id).catch((e) => { handleAuthError(e); throw e; }) });

  const send = async () => {
    setBusy(true);
    try {
      await api.admin.replySupport(id, body.trim());
      toast('success', 'Reply sent');
      setBody('');
      await qc.invalidateQueries();
    } catch (e) { handleAuthError(e); toast('error', errMsg(e)); } finally { setBusy(false); }
  };
  const setStatus = (status: (typeof STATUSES)[number]) =>
    run({ title: 'Change ticket status', description: `Set this ticket to ${humanize(status)}.`, confirmLabel: 'Change status', success: 'Status updated' }, () => api.admin.setSupportStatus(id, status));

  const t = q.data;
  return (
    <>
      <Link to="/support" className="mb-4 inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />Back to inbox</Link>
      {q.isPending ? <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>
        : q.isError ? <Card><ErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>
        : t && (
          <>
            <PageHeader title={`#${t.number} ${t.subject}`} subtitle={`${humanize(t.category)} - opened ${fmtDate(t.createdAt)}`} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card className="divide-y divide-line">
                  <h2 className="sr-only">Conversation</h2>
                  {t.messages.map((m) => (
                    <div key={m.id} className={`p-4 ${m.fromStaff ? 'bg-teal-tint' : ''}`}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className="font-semibold text-ink">{m.authorName}{m.fromStaff ? ' (staff)' : ''}</span>
                        <span>{fmtDate(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                      {m.attachments.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {m.attachments.map((a, i) => <li key={a}><a href={a} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Attachment {i + 1}<span className="sr-only"> (opens in new tab)</span></a></li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </Card>
                <Card className="space-y-3 p-4">
                  <label htmlFor="reply" className="block text-sm font-medium text-subtle">Reply</label>
                  <Textarea id="reply" rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} disabled={t.status === 'CLOSED'} placeholder={t.status === 'CLOSED' ? 'This ticket is closed' : 'Write a reply to the user'} />
                  <Button variant="primary" loading={busy} disabled={!body.trim() || t.status === 'CLOSED'} onClick={send}>{busy ? 'Sending...' : 'Send reply'}</Button>
                </Card>
              </div>
              <Card className="space-y-4 self-start p-4 text-sm">
                <div><div className="text-muted">Status</div><div className="mt-1"><StatusBadge value={t.status} /></div></div>
                <div>
                  <label htmlFor="status" className="text-muted">Change status</label>
                  <Select id="status" className="mt-1" value={t.status} onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}>
                    {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </Select>
                </div>
                <div><div className="text-muted">User</div><Link to="/users" className="font-medium text-teal-700 hover:underline">{t.userName}</Link></div>
                <div><div className="text-muted">Related provider</div>{t.providerId ? <Link to={`/providers?open=${t.providerId}`} className="font-medium text-teal-700 hover:underline">View provider</Link> : <span>None</span>}</div>
              </Card>
            </div>
          </>
        )}
    </>
  );
}
