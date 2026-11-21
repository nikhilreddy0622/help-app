import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, MessageSquare, Phone, Star } from 'lucide-react';
import type { ProviderPublicProfile } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';
import { Button, LinkButton } from '../ui/Button';
import { Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { PresenceNote, PresencePill } from '../ui/Presence';
import { ReviewForm } from '../reviews/ReviewForm';

/** Sticky contact panel: status, first-message composer (Chat) and "Show phone number". */
export function ContactPanel({ p }: { p: ProviderPublicProfile }) {
  const api = useApi();
  const nav = useNavigate();
  const loc = useLocation();
  const { status } = useAuth();
  const authed = status === 'authed';
  const next = `/login?next=${encodeURIComponent(loc.pathname)}`;
  const [composer, setComposer] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const start = useMutation({ mutationFn: () => api.conversations.start(p.id, text.trim()), onSuccess: (c) => nav(`/account/messages/${c.id}`) });
  const phone = useMutation({ mutationFn: () => api.providers.revealPhone(p.id) });
  const copy = async () => { try { await navigator.clipboard.writeText(phone.data?.phone ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };
  const away = p.status === 'AWAY' || p.status === 'BUSY';

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-1"><div><PresencePill status={p.status} label={p.statusLabel} /></div><PresenceNote message={p.statusMessage} updatedAt={p.statusUpdatedAt} /></div>
      {away && <p className="mt-3 rounded-md bg-surface p-3 text-sm text-subtle">{p.status === 'AWAY' ? `${p.statusLabel}` : p.statusLabel}. You can still message and they will reply when they are back.</p>}
      <div className="mt-4 flex flex-col gap-2.5">
        {!composer ? (
          <Button size="lg" icon={<MessageSquare className="h-5 w-5" />} onClick={() => setComposer(true)}>Chat</Button>
        ) : !authed ? (
          <LinkButton to={next} size="lg">Log in to chat</LinkButton>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) start.mutate(); }}>
            <Textarea label={`Message ${p.displayName}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Hi, I need help with..." hint="Do not share bank details or OTPs in chat." autoFocus />
            {start.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(start.error)}</p>}
            <div className="flex gap-2"><Button type="submit" loading={start.isPending} disabled={!text.trim()}>Send message</Button><Button variant="ghost" onClick={() => setComposer(false)}>Cancel</Button></div>
          </form>
        )}
        {p.phoneAvailable && (phone.data ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-success-bg px-3 py-2.5 text-sm font-medium text-success-fg">
            <span className="flex items-center gap-2"><Phone className="h-4 w-4" aria-hidden /><span className="select-all font-semibold">{phone.data.phone}</span></span>
            <button type="button" onClick={() => void copy()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/40 bg-white px-2.5 text-xs font-semibold text-success-fg hover:bg-surface">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}{copied ? 'Copied' : 'Copy'}</button>
          </div>
        ) : (
          <Button size="lg" variant="secondary" icon={<Phone className="h-5 w-5" />} loading={phone.isPending} onClick={() => (authed ? phone.mutate() : nav(next))}>Show phone number</Button>
        ))}
        {phone.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(phone.error)}</p>}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Free for customers. Log in is required to chat or see the phone number.</p>
    </div>
  );
}

/** Review gate: eligibility comes from the server; explains why when not allowed. */
export function ReviewGate({ p }: { p: ProviderPublicProfile }) {
  const api = useApi();
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['eligibility', p.id], enabled: status === 'authed', queryFn: () => api.reviews.eligibility(p.id) });
  const why: Record<string, string> = {
    SELF: 'You cannot review your own profile.',
    NO_INTERACTION: 'Chat with this professional or view their number, then you can rate them here.',
    ALREADY_REVIEWED: 'You have already reviewed this professional. Thank you.',
    SIGNED_OUT: 'Log in to review professionals you have contacted.',
  };
  let body: React.ReactNode = <p className="text-sm text-subtle">{why.SIGNED_OUT} Reviews are labelled &ldquo;Contacted via help&rdquo;.</p>;
  if (status === 'authed') {
    if (q.isPending) return null;
    body = q.data?.canReview
      ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink">You contacted {p.displayName}. Share how it went.</p><Button size="sm" icon={<Star className="h-4 w-4" />} onClick={() => setOpen(true)}>Rate and review</Button></div>
      : <p className="text-sm text-subtle">{why[q.data?.reason ?? 'NO_INTERACTION']}</p>;
  }
  return (
    <div className="mb-4 rounded-lg bg-accent-soft p-4">
      {body}
      <Modal open={open} onClose={() => setOpen(false)} title={`Review ${p.displayName}`}><p className="mb-3 text-sm text-subtle">Your review is labelled &ldquo;Contacted via help&rdquo;.</p><ReviewForm providerId={p.id} onDone={() => setTimeout(() => setOpen(false), 1200)} /></Modal>
    </div>
  );
}
