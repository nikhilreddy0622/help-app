import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Briefcase, Copy, MapPin, Phone, Search, Users } from 'lucide-react';
import type { JobCard } from '@help/types';
import { errorMessage, useApi } from '../../lib/api';
import { formatINR, timeAgo } from '../../lib/format';
import { useAuth } from '../../state/AuthContext';
import { useUserLocation } from '../../state/LocationContext';
import { Seo } from '../../components/ui/Seo';
import { Button, LinkButton } from '../../components/ui/Button';
import { Avatar, Tag } from '../../components/ui/Bits';
import { EmptyState, ErrorState, SkeletonList } from '../../components/ui/States';

const TYPE_LABEL: Record<string, string> = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', GIG: 'Gig / one-off' };
const TYPES = [['', 'All'], ['FULL_TIME', 'Full-time'], ['PART_TIME', 'Part-time'], ['GIG', 'Gig']] as const;

function payLabel(min: number | null, max: number | null, unit: string | null): string {
  const per = unit ? `/${unit}` : '';
  if (min == null && max == null) return 'Pay on ask';
  if (min != null && max != null && min !== max) return `${formatINR(min)}–${formatINR(max).replace('₹', '')}${per}`;
  return `${formatINR((min ?? max)!)}${per}`;
}
const place = (j: JobCard) => [j.locality, j.city].filter(Boolean).join(', ');

function JobRow({ j }: { j: JobCard }) {
  return (
    <li>
      <Link to={`/jobs/${j.id}`} className="card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
        <Avatar name={j.providerName} src={j.providerAvatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-navy">{j.title}</p>
          <p className="truncate text-sm text-subtle">{j.providerName}{j.categoryName ? ` · ${j.categoryName}` : ''}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-ink">{payLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}</span>
            <Tag tone="info">{TYPE_LABEL[j.jobType] ?? j.jobType}</Tag>
            {place(j) && <span className="flex items-center gap-1 text-subtle"><MapPin className="h-3.5 w-3.5" aria-hidden />{place(j)}{j.distanceKm != null ? ` · ${j.distanceKm.toFixed(1)} km` : ''}</span>}
          </div>
        </div>
        <span className="hidden flex-none text-xs text-muted sm:block">{timeAgo(j.createdAt)}</span>
      </Link>
    </li>
  );
}

/** Public job board: work posted by professionals near the visitor. */
export function JobsList() {
  const api = useApi();
  const { location } = useUserLocation();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [jobType, setJobType] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['jobs', location.lat, location.lng, q, jobType],
    queryFn: ({ pageParam }) => api.jobs.search({ lat: location.lat, lng: location.lng, radiusKm: 50, q: q || undefined, jobType: (jobType || undefined) as JobCard['jobType'] | undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="container-page py-8 md:py-12">
      <Seo title={`Jobs near ${location.label}`} description="Find full-time, part-time and gig work posted by local professionals on help." path="/jobs" />
      <h1 className="text-3xl md:text-4xl">Looking for work?</h1>
      <p className="mt-2 text-lg text-subtle">Jobs posted by professionals near {location.label}. Apply directly, no fees.</p>

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}>
        <label className="relative flex-1">
          <span className="sr-only">Search jobs</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Electrician helper, driver, tutor…" className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[15px] outline-none focus:border-teal-700" />
        </label>
        <Button type="submit" size="lg">Search</Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Job type">
        {TYPES.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={jobType === v} onClick={() => setJobType(v)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${jobType === v ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink hover:border-navy'}`}>{l}</button>
        ))}
      </div>

      <div className="mt-6">
        {query.isPending ? <SkeletonList rows={4} height="h-24" /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !items.length ? (
          <EmptyState icon={<Briefcase className="h-8 w-8" aria-hidden />} title="No jobs nearby yet" text="Try another search or check back soon. Professionals post new work every day." action={<LinkButton to="/search" variant="secondary">Find professionals instead</LinkButton>} />
        ) : (
          <>
            <ul className="grid gap-3">{items.map((j) => <JobRow key={j.id} j={j} />)}</ul>
            {query.hasNextPage && <div className="mt-6 text-center"><Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Show more jobs</Button></div>}
          </>
        )}
      </div>
      <p className="mt-10 text-sm text-subtle">Are you a professional who needs help? <Link to="/pro">Post a job</Link> from your professional area or the help app.</p>
    </div>
  );
}

export function JobDetailPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const nav = useNavigate();
  const loc = useLocation();
  const { status } = useAuth();
  const [copied, setCopied] = useState(false);
  const q = useQuery({ queryKey: ['job', id], queryFn: () => api.jobs.get(id) });
  const reveal = useMutation({ mutationFn: () => api.jobs.revealPhone(id) });
  if (q.isPending) return <div className="container-page max-w-3xl py-10"><SkeletonList rows={3} height="h-28" /></div>;
  if (q.isError) return <div className="container-page max-w-3xl py-10"><ErrorState error={q.error} onRetry={() => void q.refetch()} title="Could not load this job" /></div>;
  const j = q.data;
  const closed = j.status !== 'OPEN';
  const copy = async (phone: string) => { try { await navigator.clipboard.writeText(phone); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };
  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <Seo title={`${j.title}${j.city ? ` in ${j.city}` : ''}`} description={j.description.slice(0, 155)} path={`/jobs/${j.id}`} />
      <Link to="/jobs" className="text-sm font-semibold">← All jobs</Link>
      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2"><Tag tone="info">{TYPE_LABEL[j.jobType] ?? j.jobType}</Tag>{closed && <Tag tone="warning">No longer taking applications</Tag>}</div>
        <h1 className="mt-3 text-2xl md:text-3xl">{j.title}</h1>
        <p className="mt-2 text-2xl font-bold text-navy">{payLabel(j.payMinPaise, j.payMaxPaise, j.payUnit)}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-subtle">
          {place(j) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{place(j)}</span>}
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />{j.openings} {j.openings === 1 ? 'opening' : 'openings'}</span>
          <span>Posted {timeAgo(j.createdAt)}</span>
        </div>
        <p className="mt-6 whitespace-pre-line leading-relaxed text-ink">{j.description}</p>
      </div>

      <div className="card mt-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={j.providerName} src={j.providerAvatarUrl} size={52} />
        <div className="min-w-0 flex-1"><p className="text-sm text-subtle">Posted by</p><p className="truncate font-semibold text-navy">{j.providerName}</p></div>
        {!closed && (reveal.data ? (
          <div className="flex items-center gap-2"><span className="text-lg font-bold tracking-wide text-navy">{reveal.data.phone}</span><Button variant="secondary" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={() => void copy(reveal.data.phone)}>{copied ? 'Copied' : 'Copy'}</Button></div>
        ) : (
          <Button icon={<Phone className="h-4 w-4" aria-hidden />} loading={reveal.isPending} onClick={() => (status === 'authed' ? reveal.mutate() : nav(`/login?next=${encodeURIComponent(loc.pathname)}`))}>{status === 'authed' ? 'Show number' : 'Log in to see number'}</Button>
        ))}
      </div>
      {reveal.isError && <p role="alert" className="mt-2 text-sm font-medium text-danger">{errorMessage(reveal.error)}</p>}
      <p className="mt-6 text-sm text-subtle">Never pay anyone to get a job. Report a suspicious posting through <Link to="/support/new">Report a problem</Link>.</p>
    </div>
  );
}
