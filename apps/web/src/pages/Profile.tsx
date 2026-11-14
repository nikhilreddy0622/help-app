import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Bookmark, Flag, MessageSquare, Share2 } from 'lucide-react';
import { ApiError } from '@help/api-client';
import type { ProviderPublicProfile } from '@help/types';
import { useApi } from '../lib/api';
import { isRedirect, profileQuery, redirectPath } from '../lib/queries';
import { profileJsonLd } from '../lib/jsonld';
import { useSite } from '../state/SiteContext';
import { useAuth } from '../state/AuthContext';
import { Seo } from '../components/ui/Seo';
import { Button, LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { ProfileView } from '../components/provider/ProfileView';
import { ContactPanel, ReviewGate } from '../components/provider/ContactPanel';
import { ReportModal } from '../components/provider/ReportModal';
import { Modal } from '../components/ui/Modal';
import { errorMessage } from '../lib/api';

function Actions({ p, onReport }: { p: ProviderPublicProfile; onReport: () => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const { status } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [copied, setCopied] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const block = useMutation({ mutationFn: () => api.blockProvider(p.id), onSuccess: () => { setBlockOpen(false); nav('/search'); } });
  const saved = useQuery({ queryKey: ['saved-ids'], enabled: status === 'authed', queryFn: async () => (await api.users.saved()).items.map((x) => x.id) });
  const isSaved = saved.data?.includes(p.id) ?? false;
  const toggle = useMutation({
    mutationFn: async () => { if (isSaved) await api.users.unsave(p.id); else await api.users.save(p.id); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['saved-ids'] }); void qc.invalidateQueries({ queryKey: ['saved'] }); },
  });
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.displayName, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user cancelled */ }
  };
  const b = 'inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-3 text-sm font-medium text-navy hover:bg-surface';
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={b} onClick={() => void share()}><Share2 className="h-4 w-4" aria-hidden />{copied ? 'Link copied' : 'Share'}</button>
      <button type="button" className={b} aria-pressed={isSaved} disabled={toggle.isPending} onClick={() => (status === 'authed' ? toggle.mutate() : nav(`/login?next=${encodeURIComponent(loc.pathname)}`))}>
        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-teal text-teal' : ''}`} aria-hidden />{isSaved ? 'Saved' : 'Save'}
      </button>
      <button type="button" className={b} onClick={onReport}><Flag className="h-4 w-4" aria-hidden />Report</button>
      <button type="button" className={b} onClick={() => (status === 'authed' ? setBlockOpen(true) : nav(`/login?next=${encodeURIComponent(loc.pathname)}`))}><Ban className="h-4 w-4" aria-hidden />Block</button>
      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title={`Block ${p.displayName}?`}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBlockOpen(false)}>Cancel</Button><Button variant="danger" loading={block.isPending} onClick={() => block.mutate()}>Block</Button></div>}>
        <p className="text-sm text-ink">They will no longer appear in your search results, and you will not be able to message them.</p>
        {block.isError && <p role="alert" className="mt-3 text-sm font-medium text-danger">{errorMessage(block.error)}</p>}
        {block.isSuccess && <p role="status" className="mt-3 text-sm font-medium text-success-fg">Blocked.</p>}
      </Modal>
    </div>
  );
}

export default function ProfilePage() {
  const { slug = '' } = useParams();
  const api = useApi();
  const { origin } = useSite();
  const nav = useNavigate();
  const q = useQuery(profileQuery(api, slug));
  const [contact, setContact] = useState(false);
  const [report, setReport] = useState(false);

  if (q.isPending) return <div className="container-page py-6"><Skeleton className="h-52 w-full" /><Skeleton className="mt-6 h-40 w-full" /></div>;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) {
      return <div className="container-page py-12"><Seo title="Professional not found" noindex /><EmptyState title="This profile is not available" text="It may have been removed or is not currently public." action={<LinkButton to="/search">Find professionals</LinkButton>} /></div>;
    }
    return <div className="container-page py-12"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>;
  }
  if (isRedirect(q.data)) return <Navigate to={redirectPath(q.data.redirectTo)} replace />;
  const p = q.data;
  return (
    <>
      <Seo
        title={`${p.displayName}, ${p.categoryName}${p.locality ? ` in ${p.locality}` : ''}`}
        description={`${p.headline}. ${p.ratingAvg ? `Rated ${p.ratingAvg.toFixed(1)} from ${p.ratingCount} reviews. ` : ''}${p.experienceYears} years of experience. Chat or call directly on help.`}
        path={`/professionals/${p.slug}`} image={p.avatarUrl} type="profile" jsonLd={[profileJsonLd(p, origin)]}
      />
      <div className="container-page grid gap-8 pb-24 md:pt-0 lg:grid-cols-[1fr_340px] lg:pb-8 lg:pt-4">
        <div className="min-w-0">
          <div className="hidden pb-3 text-sm text-subtle lg:block"><Link to="/search">Search</Link> / <span>{p.displayName}</span></div>
          <div className="mb-4 hidden md:block"><Actions p={p} onReport={() => setReport(true)} /></div>
          <ProfileView p={p} reviewSlot={<ReviewGate p={p} />} />
          <div className="mt-6 md:hidden px-4"><Actions p={p} onReport={() => setReport(true)} /></div>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-24"><ContactPanel p={p} /></div></aside>
      </div>
      {/* Mobile / tablet sticky contact bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 lg:hidden">
        <div className="mx-auto max-w-xl"><Button size="lg" className="w-full" icon={<MessageSquare className="h-5 w-5" />} onClick={() => setContact(true)}>Chat or show phone number</Button></div>
      </div>
      <Modal open={contact} onClose={() => setContact(false)} title={`Contact ${p.displayName}`}><ContactPanel p={p} /></Modal>
      <ReportModal providerId={p.id} open={report} onClose={() => setReport(false)} />
    </>
  );
}
