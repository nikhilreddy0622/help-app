import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Briefcase, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import type { ProviderPublicProfile, ReviewDto } from '@help/types';
import { priceUnitLabel } from '@help/ui-tokens';
import { useApi } from '../../lib/api';
import { formatDate, formatINR, minuteLabel, WEEKDAYS } from '../../lib/format';
import { Avatar, SectionTitle, Stars, VerificationBadgeRow } from '../ui/Bits';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/States';
import { PresenceNote, PresencePill } from '../ui/Presence';
import { Lightbox } from './Lightbox';

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-center"><b className="text-lg text-navy">{value}</b><span className="text-xs text-subtle">{label}</span></div>;
}

/** Consistent, soft placeholder for empty sections so a sparse profile still reads as finished, not broken. */
function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-3.5 text-sm text-subtle">{children}</p>;
}

function WorkingHours({ p }: { p: ProviderPublicProfile }) {
  if (p.workingHours.rules.length === 0) return <EmptyNote>Working hours not set — message to check availability.</EmptyNote>;
  const byDay = WEEKDAYS.map((name, d) => ({ name, ranges: p.workingHours.rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute) }));
  return (
    <div>
      <dl className="divide-y divide-divider rounded-lg border border-line bg-white text-sm">
        {byDay.map((d) => (
          <div key={d.name} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="font-medium text-navy">{d.name}</dt>
            <dd className="text-right text-subtle">{d.ranges.length ? d.ranges.map((r) => `${minuteLabel(r.startMinute)} – ${minuteLabel(r.endMinute)}`).join(', ') : 'Closed'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">Times shown in {p.workingHours.timezone}.</p>
    </div>
  );
}

function Review({ r }: { r: ReviewDto }) {
  return (
    <li className="border-b border-divider py-4 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-navy">{r.authorName}<span className="inline-flex items-center gap-1 text-xs font-medium text-teal-800"><ShieldCheck className="h-3.5 w-3.5 text-teal" aria-hidden />Contacted via help</span></p>
        <time className="text-xs text-muted" dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
      </div>
      <div className="mt-1"><Stars value={r.overall} /></div>
      {r.comment && <p className="mt-2 text-sm text-ink">{r.comment}</p>}
      {r.reply && <div className="mt-3 rounded-md bg-surface p-3 text-sm"><p className="mb-1 text-xs font-semibold text-subtle">Reply from the professional</p><p className="text-ink">{r.reply}</p></div>}
    </li>
  );
}

function Reviews({ p }: { p: ProviderPublicProfile }) {
  const api = useApi();
  const [more, setMore] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ['reviews', p.id], enabled: more,
    queryFn: ({ pageParam }) => api.providers.reviews(p.id, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined, getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const items = more && q.data ? q.data.pages.flatMap((x) => x.items) : p.recentReviews;
  if (p.ratingCount === 0 && items.length === 0) return <p className="rounded-lg border border-dashed border-line-strong bg-white p-6 text-center text-sm text-subtle">No reviews yet. This professional is new on help.</p>;
  return (
    <div>
      <ul className="card px-5">{items.map((r) => <Review key={r.id} r={r} />)}</ul>
      {q.isError && <div className="mt-3"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>}
      {(!more || q.hasNextPage) && p.ratingCount > items.length - 0 && (
        <div className="mt-4 text-center"><Button variant="secondary" loading={q.isFetching} onClick={() => (more ? void q.fetchNextPage() : setMore(true))}>Show more reviews</Button></div>
      )}
    </div>
  );
}

/** Whole public profile (used on the public page and in the onboarding preview). */
export function ProfileView({ p, reviewSlot }: { p: ProviderPublicProfile; reviewSlot?: React.ReactNode }) {
  const [light, setLight] = useState<number | null>(null);
  const images = p.portfolio.filter((x) => x.kind === 'IMAGE' || x.kind === 'CERTIFICATE');
  return (
    <article>
      <div className="h-36 w-full bg-navy md:h-52 md:rounded-b-xl" style={p.coverUrl ? { backgroundImage: `url(${p.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} role="img" aria-label={p.coverUrl ? `${p.displayName} cover photo` : undefined} aria-hidden={!p.coverUrl} />
      <div className="px-4 md:px-0">
        <div className="-mt-11 flex items-end gap-4 md:-mt-14">
          <div className="rounded-full border-4 border-white bg-white"><Avatar name={p.displayName} src={p.avatarUrl} size={88} /></div>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{p.displayName}</h1>
        <p className="mt-1 text-[15px] text-ink">{p.headline} · {p.experienceYears} years</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-subtle"><MapPin className="h-4 w-4 flex-none text-teal" aria-hidden />{[p.locality, `serves within ${p.serviceRadiusKm} km`, p.languages.join(', ')].filter(Boolean).join(' · ')}</p>
        <div className="mt-3 flex flex-col gap-1"><div><PresencePill status={p.status} label={p.statusLabel} /></div><PresenceNote message={p.statusMessage} updatedAt={p.statusUpdatedAt} /></div>
        <div className="mt-3"><VerificationBadgeRow badges={p.badges} qualification={p.qualifications[0]} /></div>
        <div className="card mt-4 flex divide-x divide-line py-2">
          <Stat value={p.isNew || p.ratingAvg === null ? 'New' : `★ ${p.ratingAvg.toFixed(1)}`} label={p.ratingCount ? `${p.ratingCount} reviews` : 'no reviews yet'} />
          <Stat value={new Date(p.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} label="member since" />
          <Stat value={p.responseMinutes ? `~${p.responseMinutes} min` : '—'} label="reply time" />
        </div>

        <nav aria-label="Profile sections" className="sticky top-16 z-10 -mx-4 mt-6 flex gap-5 overflow-x-auto border-b border-line bg-canvas px-4 md:mx-0 md:px-0">
          {[['services', 'Services'], ['about', 'About'], ['availability', 'Working hours'], ['portfolio', 'Portfolio'], ['reviews', 'Reviews']].map(([id, l]) => (
            <a key={id} href={`#${id}`} className="flex h-11 flex-none items-center border-b-2 border-transparent text-sm font-semibold text-subtle hover:border-teal-700 hover:text-navy" style={{ color: '#475569' }}>{l}</a>
          ))}
        </nav>

        <section id="services" className="scroll-mt-28 pt-7"><SectionTitle>Services and prices</SectionTitle>
          {p.services.length === 0 ? <EmptyNote>No fixed prices listed — message to ask for a quote.</EmptyNote> : (
            <ul className="card divide-y divide-divider px-5">{p.services.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0"><p className="font-medium text-navy">{s.title}</p>{s.description && <p className="mt-0.5 text-sm text-subtle">{s.description}</p>}{s.durationMinutes && <p className="mt-0.5 text-xs text-muted">About {s.durationMinutes} min</p>}</div>
                <p className="flex-none text-right font-bold text-navy">{formatINR(s.pricePaise)} <span className="block text-xs font-normal text-muted sm:inline">{priceUnitLabel[s.priceUnit] ?? ''}{s.negotiable ? ' · negotiable' : ''}</span></p>
              </li>))}
            </ul>)}
        </section>
        <section id="about" className="scroll-mt-28 pt-7"><SectionTitle>About</SectionTitle>
          {p.bio ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{p.bio}</p>
            : (p.skills.length === 0 && p.qualifications.length === 0 && p.areasServed.length === 0) && <EmptyNote>This professional hasn’t added a description yet.</EmptyNote>}
          {p.skills.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{p.skills.map((s) => <li key={s} className="rounded-full bg-surface px-3 py-1 text-sm text-subtle">{s}</li>)}</ul>}
          {p.qualifications.length > 0 && <p className="mt-4 flex items-start gap-2 text-sm text-subtle"><Briefcase className="mt-0.5 h-4 w-4 flex-none text-navy" aria-hidden />{p.qualifications.join(' · ')}</p>}
          {p.areasServed.length > 0 && <p className="mt-2 text-sm text-subtle">Areas served: {p.areasServed.join(', ')}</p>}
        </section>
        <section id="availability" className="scroll-mt-28 pt-7"><SectionTitle>Working hours</SectionTitle><WorkingHours p={p} /></section>
        <section id="portfolio" className="scroll-mt-28 pt-7"><SectionTitle>Portfolio</SectionTitle>
          {images.length === 0 ? <EmptyNote>No work photos yet.</EmptyNote> : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((it, i) => (
              <li key={it.id}><button type="button" onClick={() => setLight(i)} className="block aspect-square w-full overflow-hidden rounded-lg border border-line" aria-label={`Open ${it.title ?? `image ${i + 1}`}`}><img src={it.url} alt={it.title ?? ''} loading="lazy" className="h-full w-full object-cover" /></button></li>))}
            </ul>)}
        </section>
        <section id="reviews" className="scroll-mt-28 pt-7"><SectionTitle>Reviews</SectionTitle>{reviewSlot}<Reviews p={p} /></section>
        <p className="mt-8 flex items-center gap-2 text-xs text-muted"><MessageCircle className="h-4 w-4" aria-hidden />Chat in the app, or show the phone number to call directly.</p>
      </div>
      <Lightbox items={images} index={light} onIndex={setLight} onClose={() => setLight(null)} />
    </article>
  );
}
