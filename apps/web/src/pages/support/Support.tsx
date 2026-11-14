import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LifeBuoy, Paperclip, Plus } from 'lucide-react';
import type { TicketStatus } from '@help/types';
import { CreateTicketSchema, TicketMessageSchema } from '@help/validation';
import { errorMessage, useApi } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { RequireAuth } from '../../components/layout/AreaLayout';
import { Seo } from '../../components/ui/Seo';
import { Tag } from '../../components/ui/Bits';
import { Button, LinkButton } from '../../components/ui/Button';
import { Select, Input, Textarea, fieldErrors } from '../../components/ui/Field';
import { EmptyState, ErrorState, QueryBoundary, SkeletonList } from '../../components/ui/States';
import { FileUpload } from '../../components/forms/Inputs';

const STATUS: Record<TicketStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'neutral' }> = {
  OPEN: { label: 'Open', tone: 'info' }, WAITING_ON_USER: { label: 'Waiting for you', tone: 'warning' }, RESOLVED: { label: 'Resolved', tone: 'success' }, CLOSED: { label: 'Closed', tone: 'neutral' },
};
const CATEGORIES = [['BOOKING', 'A professional I contacted'], ['PAYMENT', 'Payments or subscription'], ['ACCOUNT', 'My account'], ['PROFILE', 'A professional profile'], ['SAFETY', 'Safety'], ['OTHER', 'Something else']];

function Attachments({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">{urls.map((u) => (
      <li key={u}>{/\.(png|jpe?g|webp)(\?|$)/i.test(u) ? <a href={u} target="_blank" rel="noreferrer"><img src={u} alt="Attachment" className="h-20 w-20 rounded-md border border-line object-cover" loading="lazy" /></a>
        : <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs font-medium"><Paperclip className="h-3.5 w-3.5" aria-hidden />Attachment</a>}</li>))}
    </ul>
  );
}

function ListInner() {
  const api = useApi();
  const q = useInfiniteQuery({ queryKey: ['support', 'list'], queryFn: ({ pageParam }) => api.support.list({ cursor: pageParam }), initialPageParam: undefined as string | undefined, getNextPageParam: (l) => l.meta.nextCursor ?? undefined });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="container-page max-w-3xl py-8">
      <Seo title="Support" noindex />
      <div className="mb-5 flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">Support</h1><LinkButton to="/support/new" size="sm"><Plus className="h-4 w-4" aria-hidden />New ticket</LinkButton></div>
      {q.isPending ? <SkeletonList rows={3} height="h-20" /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : items.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="h-6 w-6" aria-hidden />} title="No support tickets" text="Check the help centre first, or start a conversation with our team." action={<div className="flex gap-2"><LinkButton to="/help" variant="secondary">Help centre</LinkButton><LinkButton to="/support/new">Contact support</LinkButton></div>} />
      ) : (
        <>
          <ul className="card divide-y divide-divider">{items.map((t) => (
            <li key={t.id}><Link to={`/support/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-surface" style={{ color: '#1E293B' }}>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-navy">#{t.number} {t.subject}</p><p className="text-xs text-subtle">{t.category.toLowerCase()} · updated {formatDateTime(t.lastMessageAt)}</p></div>
              {t.unreadForUser && <span aria-label="New reply" className="h-2.5 w-2.5 rounded-full bg-teal-700" />}
              <Tag tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Tag></Link></li>))}
          </ul>
          {q.hasNextPage && <div className="mt-4 text-center"><Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
export function SupportList() { return <RequireAuth><ListInner /></RequireAuth>; }

function NewInner() {
  const api = useApi();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const providerId = sp.get('provider') ?? undefined;
  const [f, setF] = useState({ category: providerId ? 'SAFETY' : 'OTHER', subject: '', message: '' });
  const [files, setFiles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({ mutationFn: (b: ReturnType<typeof CreateTicketSchema.parse>) => api.support.create(b), onSuccess: (t) => { void qc.invalidateQueries({ queryKey: ['support'] }); nav(`/support/${t.id}`, { replace: true }); } });
  return (
    <div className="container-page max-w-2xl py-8">
      <Seo title="Contact support" noindex />
      <Link to="/support" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft className="h-4 w-4" aria-hidden />Support</Link>
      <h1 className="text-2xl font-bold tracking-tight">Contact support</h1>
      <p className="mt-1 text-sm text-subtle">Check the <Link to="/help">help centre</Link> for quick answers. Our replies appear in this app.</p>
      <form className="card mt-5 flex flex-col gap-4 p-5" noValidate onSubmit={(e) => {
        e.preventDefault();
        const body = { ...f, providerId, attachments: files };
        const errs = fieldErrors(CreateTicketSchema, body); setErrors(errs);
        if (!Object.keys(errs).length) m.mutate(CreateTicketSchema.parse(body));
      }}>
        {providerId && <p className="rounded-md bg-info-bg p-3 text-sm text-info-fg">This ticket will be linked to the professional you are reporting.</p>}
        <Select label="What is this about?" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Input label="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} error={errors.subject} maxLength={120} />
        <Textarea label="Describe the problem" rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} error={errors.message} maxLength={4000} />
        <FileUpload purpose="SUPPORT" accept="image/jpeg,image/png,image/webp,application/pdf" label="Attach a file" onUploaded={(url) => setFiles((x) => (x.length < 4 ? [...x, url] : x))} />
        <Attachments urls={files} />
        {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
        <div><Button type="submit" size="lg" loading={m.isPending}>Send to support</Button></div>
      </form>
    </div>
  );
}
export function SupportNew() { return <RequireAuth><NewInner /></RequireAuth>; }

function TicketInner() {
  const { id = '' } = useParams();
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['support', id], queryFn: () => api.support.get(id) });
  const [text, setText] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const done = () => { void qc.invalidateQueries({ queryKey: ['support'] }); };
  const reply = useMutation({ mutationFn: () => api.support.reply(id, text.trim(), files), onSuccess: () => { setText(''); setFiles([]); done(); } });
  const close = useMutation({ mutationFn: () => api.support.close(id), onSuccess: done });
  return (
    <div className="container-page max-w-3xl py-8">
      <Seo title="Support ticket" noindex />
      <Link to="/support" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft className="h-4 w-4" aria-hidden />All tickets</Link>
      <QueryBoundary query={q} skeleton={<SkeletonList rows={3} height="h-24" />}>
        {(t) => (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h1 className="text-xl font-bold">#{t.number} {t.subject}</h1><p className="text-sm text-subtle">{t.category.toLowerCase()} · opened {formatDateTime(t.createdAt)}</p></div>
              <Tag tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Tag>
            </div>
            <ul className="flex flex-col gap-3" aria-live="polite" aria-label="Conversation">
              {t.messages.map((m) => (
                <li key={m.id} className={`max-w-[88%] rounded-lg p-4 ${m.fromStaff ? 'self-start bg-white border border-line' : 'self-end bg-teal-tint'}`}>
                  <p className="text-xs font-semibold text-subtle">{m.fromStaff ? `${m.authorName} (help support)` : 'You'} · {formatDateTime(m.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{m.body}</p>
                  <Attachments urls={m.attachments} />
                </li>))}
            </ul>
            {t.status === 'CLOSED' ? <p className="mt-6 rounded-md bg-surface p-3 text-sm text-subtle">This ticket is closed. <Link to="/support/new">Start a new ticket</Link> if you still need help.</p> : (
              <form className="card mt-6 flex flex-col gap-3 p-4" onSubmit={(e) => {
                e.preventDefault();
                const r = TicketMessageSchema.safeParse({ body: text, attachments: files });
                if (!r.success) { setErr('Write a message first'); return; }
                setErr(null); reply.mutate();
              }}>
                <Textarea label="Reply" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
                <FileUpload purpose="SUPPORT" accept="image/jpeg,image/png,image/webp,application/pdf" label="Attach a file" onUploaded={(url) => setFiles((x) => (x.length < 4 ? [...x, url] : x))} />
                <Attachments urls={files} />
                {(err || reply.isError || close.isError) && <p role="alert" className="text-sm font-medium text-danger">{err ?? errorMessage(reply.error ?? close.error)}</p>}
                <div className="flex gap-2"><Button type="submit" loading={reply.isPending}>Send reply</Button>
                  <Button variant="secondary" loading={close.isPending} onClick={() => close.mutate()}>{t.status === 'RESOLVED' ? 'Close ticket' : 'Mark as solved and close'}</Button></div>
              </form>
            )}
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
export function SupportTicket() { return <RequireAuth><TicketInner /></RequireAuth>; }
