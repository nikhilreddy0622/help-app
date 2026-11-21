import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Car, Droplets, Hammer, MapPin, Scissors, Search, ShieldCheck, Snowflake, Sparkles, UserPlus, Wallet, Zap, type LucideIcon } from 'lucide-react';
import type { Category } from '@help/types';
import { tileColor } from '@help/ui-tokens';
import { useApi } from '../lib/api';
import { categoriesQuery, homeQuery } from '../lib/queries';
import { useUserLocation } from '../state/LocationContext';
import { Seo } from '../components/ui/Seo';
import { QueryBoundary, Skeleton } from '../components/ui/States';
import { LocationPicker } from '../components/provider/LocationPicker';
import { CategoryTiles } from '../components/provider/CategoryTiles';
import { ProviderCardView } from '../components/provider/ProviderCard';
import { POSTS } from '../content/blog';
import { PostCard } from './blog/Blog';
import { useSite } from '../state/SiteContext';

const HOME_FAQ = [
  { q: 'Is help free for customers?', a: 'Yes. Searching, comparing and contacting professionals is free. You pay the professional directly for their work. help takes no commission.' },
  { q: 'How do I contact a professional?', a: 'Open their profile and send a message, or sign in and tap Show phone number to call them yourself.' },
  { q: 'Are professionals verified?', a: 'Each profile shows exactly what was checked (mobile number, ID and qualification) as separate badges, so you know what each one means.' },
  { q: 'Which services can I find?', a: 'Over 450 services: electricians, plumbers and cleaners, tutors, drivers, cooks, beauticians, photographers, mechanics, event services and more.' },
  { q: 'I am a professional. How do I join?', a: 'Create a free profile in four short steps. When you are ready to be found, choose a simple subscription. You keep every rupee you earn.' },
];

const POPULAR: [string, string, LucideIcon][] = [
  ['Electrician', 'Electrician', Zap], ['Plumber', 'Plumber', Droplets], ['AC repair and servicing', 'AC repair', Snowflake], ['House cleaning', 'Cleaning', Sparkles],
  ['Home tutor', 'Tutor', BookOpen], ['Carpenter', 'Carpenter', Hammer], ['Beautician', 'Beautician', Scissors], ['Personal driver', 'Driver', Car],
];

const BANNERS = [
  { title: 'Free for customers', body: 'Chat or call pros directly. No commission, no middleman.', cls: 'bg-navy text-white', sub: 'text-[#C9D3E6]', icon: Wallet, iconCls: 'bg-white/10 text-accent', to: '/search' },
  { title: 'See who you are hiring', body: 'Real reviews, ID and qualification badges on every profile.', cls: 'bg-[#FFF1D6] text-[#4A3200]', sub: 'text-[#7A5A14]', icon: ShieldCheck, iconCls: 'bg-white/70 text-[#4A3200]', to: '/search' },
  { title: 'Are you a professional?', body: 'Get found by customers near you. Set up in 4 steps.', cls: 'bg-[#E3F4EF] text-[#063F38]', sub: 'text-[#2E6B62]', icon: UserPlus, iconCls: 'bg-white/70 text-[#063F38]', to: '/for-professionals' },
];

function Popular({ cats, citySlug }: { cats: Category[]; citySlug: string }) {
  const list = POPULAR.map(([n, short, I]) => ({ c: cats.find((x) => x.parentId && x.name === n), short, I })).filter((x) => x.c);
  if (!list.length) return null;
  return (
    <ul className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-8 md:overflow-visible">
      {list.map(({ c, short, I }) => {
        const t = tileColor(c!.slug);
        return (
          <li key={c!.id} className="flex-none">
            <Link to={`/c/${c!.slug}/${citySlug}`} className="tile-press flex w-[72px] flex-col items-center gap-2 text-center md:w-auto" style={{ color: '#121722' }}>
              <span className="flex h-16 w-16 items-center justify-center rounded-full md:h-20 md:w-20" style={{ background: t.bg, color: t.fg }}><I className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2} aria-hidden /></span>
              <span className="text-xs font-semibold md:text-sm">{short}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Landing() {
  const api = useApi();
  const nav = useNavigate();
  const { location } = useUserLocation();
  const [q, setQ] = useState('');
  const cats = useQuery(categoriesQuery(api));
  const home = useQuery(homeQuery(api, location.lat, location.lng));
  const { origin } = useSite();
  const siteLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#org`, name: 'help', url: origin, logo: `${origin}/icon-512.png` },
      { '@type': 'WebSite', '@id': `${origin}/#site`, name: 'help', url: origin, publisher: { '@id': `${origin}/#org` }, potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={query}`, 'query-input': 'required name=query' } },
    ],
  });
  const faqLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: HOME_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams({ city: location.citySlug, lat: String(location.lat), lng: String(location.lng) });
    if (q.trim()) p.set('q', q.trim());
    nav(`/search?${p.toString()}`);
  };

  return (
    <>
      <Seo title="Find trusted local professionals near you" description="Find electricians, plumbers, tutors, beauticians and 450+ other services near you. Compare ratings, prices and availability, then chat or call. Free for customers." path="/" jsonLd={[siteLd, faqLd]} />

      <section className="rounded-b-xl bg-brand">
        <div className="container-page pb-10 pt-8 md:pb-14 md:pt-12">
          <h1 className="max-w-3xl text-3xl text-white md:text-5xl">Trusted local professionals, right around you</h1>
          <form onSubmit={submit} role="search" className="mt-6 flex flex-col gap-2 rounded-lg bg-white p-2 shadow-lift md:flex-row md:items-center">
            <label className="flex flex-1 items-center gap-3 px-3">
              <Search className="h-6 w-6 flex-none text-brand" strokeWidth={2.5} aria-hidden />
              <span className="sr-only">Search for any service</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search “electrician”, “tutor”, “cook”" className="h-12 w-full min-w-0 border-0 bg-transparent text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0" />
            </label>
            <div className="flex items-center gap-2 border-t border-divider px-2 pt-2 md:w-64 md:border-l md:border-t-0 md:pt-0"><MapPin className="h-5 w-5 flex-none text-brand" aria-hidden /><LocationPicker className="flex-1" /></div>
            <button type="submit" className="h-12 rounded-md bg-accent px-6 font-extrabold text-accent-ink transition-transform active:scale-[0.98]">Search</button>
          </form>
        </div>
      </section>

      <section className="container-page mt-8" aria-label="Highlights">
        <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible">
          {BANNERS.map((b) => (
            <li key={b.title} className="w-[85%] flex-none md:w-auto">
              <Link to={b.to} className={`tile-press flex h-full items-center gap-4 rounded-lg p-5 ${b.cls}`}>
                <span className="flex-1"><span className="block text-lg font-extrabold">{b.title}</span><span className={`mt-1 block text-sm ${b.sub}`}>{b.body}</span></span>
                <span className={`flex h-16 w-16 flex-none items-center justify-center rounded-full ${b.iconCls}`}><b.icon className="h-8 w-8" aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {cats.data && (
        <section className="container-page mt-10" aria-labelledby="popular">
          <h2 id="popular" className="mb-5 text-2xl md:text-3xl">What do you need today?</h2>
          <Popular cats={cats.data} citySlug={location.citySlug} />
        </section>
      )}

      <section className="container-page mt-10" aria-labelledby="cats">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="cats" className="text-2xl md:text-3xl">All categories</h2>
          <Link to="/services" className="inline-flex items-center gap-1 text-sm font-bold">See all<ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <QueryBoundary query={cats} skeleton={<ul className="grid grid-cols-4 gap-3 lg:grid-cols-8">{Array.from({ length: 16 }, (_, i) => <li key={i}><Skeleton className="aspect-square rounded-lg" /></li>)}</ul>} isEmpty={(d) => d.length === 0} empty={<p className="text-sm text-subtle">Categories will appear here soon.</p>}>
          {(list) => <CategoryTiles groups={list.filter((c) => !c.parentId)} />}
        </QueryBoundary>
      </section>

      {home.data && home.data.topRated.length > 0 && (
        <section className="container-page mt-12" aria-labelledby="top">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="top" className="text-2xl md:text-3xl">Top rated near {location.label.split(',')[0]}</h2>
            <Link to="/search?sort=rating" className="inline-flex items-center gap-1 text-sm font-bold">See all<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{home.data.topRated.slice(0, 6).map((p) => <ProviderCardView key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="container-page mt-12">
        <div className="flex flex-col gap-6 rounded-xl bg-navy p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-xl">
            <span className="inline-flex h-7 items-center rounded-full bg-accent px-3 text-xs font-extrabold text-accent-ink">FOR PROFESSIONALS</span>
            <h2 className="mt-3 text-2xl text-white md:text-3xl">Grow your work on help</h2>
            <p className="mt-2 text-[#C9D3E6]">Reach customers in your neighbourhood. No commission on your jobs. Live in 4 short steps.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/pro/onboarding" className="inline-flex h-[52px] items-center rounded-md bg-accent px-6 font-extrabold text-accent-ink">Create your profile</Link>
            <Link to="/for-professionals" className="inline-flex h-[52px] items-center px-2 font-bold" style={{ color: '#fff' }}>See pricing</Link>
          </div>
        </div>
      </section>

      <section className="container-page mt-12" aria-labelledby="blog">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="blog" className="text-2xl md:text-3xl">Guides and tips</h2>
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-bold">All articles<ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">{POSTS.slice(0, 3).map((p) => <PostCard key={p.slug} p={p} />)}</ul>
      </section>

      <section className="container-page mt-12" aria-labelledby="faq">
        <h2 id="faq" className="mb-5 text-2xl md:text-3xl">Common questions</h2>
        <div className="card divide-y divide-divider">
          {HOME_FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink">{f.q}<span aria-hidden className="text-2xl leading-none text-brand transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-subtle">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
