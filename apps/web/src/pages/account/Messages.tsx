import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Send, Star } from 'lucide-react';
import type { ConversationDto, MessageDto } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { areaOf } from '../../lib/links';
import { useAuth } from '../../state/AuthContext';
import { Avatar } from '../../components/ui/Bits';
import { PresencePill } from '../../components/ui/Presence';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States';
import { Seo } from '../../components/ui/Seo';
import { ReviewForm } from '../../components/reviews/ReviewForm';

type Page = { items: MessageDto[]; next: string | null }; // items newest first

function Chat({ conv, backTo }: { conv: ConversationDto; backTo: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const { me } = useAuth();
  const id = conv.id;
  const [text, setText] = useState('');
  const [review, setReview] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ['messages', id], refetchInterval: 60_000,
    queryFn: async (): Promise<Page> => { const p = await api.conversations.messages(id); return { items: p.items, next: p.meta.nextCursor }; },
  });
  const replies = useQuery({ queryKey: ['quick-replies'], enabled: conv.role === 'provider', queryFn: () => api.providers.quickReplies() });
  const older = useMutation({
    mutationFn: () => api.conversations.messages(id, { cursor: q.data?.next ?? undefined }),
    onSuccess: (p) => qc.setQueryData<Page>(['messages', id], (old) => {
      if (!old) return old;
      const seen = new Set(old.items.map((m) => m.id));
      return { items: [...old.items, ...p.items.filter((m) => !seen.has(m.id))], next: p.meta.nextCursor };
    }),
  });
  const send = useMutation({
    mutationFn: (body: string) => api.conversations.send(id, body),
    onSuccess: (m) => {
      setText('');
      qc.setQueryData<Page>(['messages', id], (old) => (old && !old.items.some((x) => x.id === m.id) ? { ...old, items: [m, ...old.items] } : old));
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
  useEffect(() => { void api.conversations.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['conversations'] }), () => undefined); }, [api, id, qc, q.data?.items.length]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [q.data?.items.length]);
  const msgs = q.data ? [...q.data.items].reverse() : [];

  return (
    <div className="card flex h-[70vh] min-h-[420px] flex-col">
      <div className="flex items-center gap-3 border-b border-divider p-3">
        <Link to={backTo} className="rounded-full p-2 text-navy hover:bg-surface lg:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar name={conv.counterpart.name} src={conv.counterpart.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy">{conv.counterpart.name}</p>
          {conv.role === 'customer' && <PresencePill status={conv.provider.status} label={conv.provider.statusLabel} />}
        </div>
        {conv.role === 'customer' && <Link to={`/professionals/${conv.provider.slug}`} className="text-sm font-semibold">View profile</Link>}
      </div>
      {conv.canReview && (
        <div className="flex items-center justify-between gap-3 bg-teal-tint px-4 py-2.5 text-sm">
          <span className="text-teal-800">How was {conv.provider.displayName}? Share a review.</span>
          <Button size="sm" icon={<Star className="h-4 w-4" />} onClick={() => setReview(true)}>Write a review</Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Messages">
        {q.isPending ? <SkeletonList rows={4} height="h-10" /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : msgs.length === 0 ? (
          <p className="py-10 text-center text-sm text-subtle">No messages yet. Say hello.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {q.data?.next && <li className="text-center"><Button variant="secondary" size="sm" loading={older.isPending} onClick={() => older.mutate()}>Load older messages</Button></li>}
            {msgs.map((m) => {
              const mine = m.senderId === me?.id && !m.auto;
              return (
                <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3.5 py-2 text-sm ${m.auto ? 'border border-dashed border-line-strong bg-white text-ink' : mine ? 'bg-teal-700 text-white' : 'bg-surface text-ink'}`}>
                    {m.auto && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Auto-reply</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? 'text-[#CCFBF1]' : 'text-subtle'}`}>{timeAgo(m.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={end} />
      </div>
      {conv.role === 'provider' && replies.data && replies.data.replies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-divider px-3 pt-2" role="group" aria-label="Quick replies">
          {replies.data.replies.map((r) => <button key={r} type="button" onClick={() => setText(r)} className="max-w-[16rem] flex-none truncate rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm text-subtle hover:bg-surface">{r}</button>)}
        </div>
      )}
      <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}>
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a message" autoComplete="off" className="h-11 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-[15px]" />
        <Button type="submit" loading={send.isPending} disabled={!text.trim()} aria-label="Send message" icon={<Send className="h-4 w-4" />}>Send</Button>
      </form>
      {send.isError && <p role="alert" className="px-4 pb-3 text-sm font-medium text-danger">{errorMessage(send.error)}</p>}
      <Modal open={review} onClose={() => setReview(false)} title={`Review ${conv.provider.displayName}`}><p className="mb-3 text-sm text-subtle">Your review is labelled &ldquo;Contacted via help&rdquo;.</p><ReviewForm providerId={conv.provider.id} onDone={() => setTimeout(() => setReview(false), 1200)} /></Modal>
    </div>
  );
}

export default function Messages() {
  const { conversationId } = useParams();
  const api = useApi();
  const loc = useLocation();
  const provider = areaOf(loc.pathname) === 'provider';
  const root = provider ? '/pro/messages' : '/account/messages';
  const q = useQuery({ queryKey: ['conversations', provider ? 'provider' : 'customer'], queryFn: async () => (await api.conversations.list({ role: provider ? 'provider' : 'customer' })).items });
  const current = q.data?.find((c) => c.id === conversationId);
  const single = useQuery({ queryKey: ['conversation', conversationId], enabled: !!conversationId && !q.isPending && !current, queryFn: () => api.conversations.get(conversationId ?? '') });
  const conv = current ?? single.data;
  return (
    <div>
      <Seo title="Messages" noindex />
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Messages</h1>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className={conversationId ? 'hidden lg:block' : ''}>
          {q.isPending ? <SkeletonList rows={4} height="h-16" /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-6 w-6" aria-hidden />} title="No conversations yet" text={provider ? 'When a customer messages you, the chat appears here.' : 'Open a professional profile and tap Chat to start.'} />
          ) : (
            <ul className="card divide-y divide-divider overflow-hidden">
              {q.data.map((t) => (
                <li key={t.id}>
                  <Link to={`${root}/${t.id}`} aria-current={t.id === conversationId ? 'page' : undefined} className={`flex items-center gap-3 p-3 hover:bg-surface ${t.id === conversationId ? 'bg-teal-tint' : ''}`} style={{ color: '#1E293B' }}>
                    <Avatar name={t.counterpart.name} src={t.counterpart.avatarUrl} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">{t.counterpart.name}</span>
                      <span className="block truncate text-sm text-subtle">{t.lastMessage?.body ?? 'No messages yet'}</span>
                    </span>
                    {t.unread > 0 && <span className="rounded-full bg-danger px-1.5 text-[11px] font-bold text-white" aria-label={`${t.unread} unread`}>{t.unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={conversationId ? '' : 'hidden lg:block'}>
          {conversationId ? (conv ? <Chat key={conv.id} conv={conv} backTo={root} /> : single.isError ? <ErrorState error={single.error} onRetry={() => void single.refetch()} /> : <SkeletonList rows={1} height="h-64" />)
            : <div className="card hidden h-64 items-center justify-center text-sm text-subtle lg:flex">Select a conversation</div>}
        </div>
      </div>
    </div>
  );
}
