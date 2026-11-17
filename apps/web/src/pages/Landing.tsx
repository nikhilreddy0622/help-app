import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, MessageSquare, Scale, Search, ShieldCheck, Star, Handshake, UserPlus, MapPin, Wallet, Zap } from 'lucide-react';
import { useApi } from '../lib/api';
import { categoriesQuery } from '../lib/queries';
import { useUserLocation } from '../state/LocationContext';
import { Seo } from '../components/ui/Seo';
import { LinkButton, Button } from '../components/ui/Button';
import { QueryBoundary, Skeleton } from '../components/ui/States';
import { LocationPicker } from '../components/provider/LocationPicker';
import { CategoryTiles } from '../components/provider/CategoryTiles';

function Steps({ title, steps }: { title: string; steps: { icon: React.ReactNode; title: string; text: string }[] }) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-teal-tint text-teal">{s.icon}</span>
            <div><p className="font-semibold text-navy">{i + 1}. {s.title}</p><p className="mt-0.5 text-sm text-subtle">{s.text}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const api = useApi();
  const nav = useNavigate();
  const { location } = useUserLocation();
  const [q, setQ] = useState('');
  const cats = useQuery(categoriesQuery(api));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams({ city: location.citySlug, lat: String(location.lat), lng: String(location.lng) });
    if (q.trim()) p.set('q', q.trim());
    nav(`/search?${p.toString()}`);
  };

  return (
    <>
      <Seo title="Find trusted local professionals near you" description="Discover verified electricians, tutors, photographers and more near you. Compare ratings, prices and availability, then chat or call. Free for customers." path="/" />
      <section className="container-page pb-2 pt-10 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Someone nearby can help with that</h1>
          <p className="mt-3 text-base text-subtle md:text-lg">Electricians, tutors, cooks, mechanics — real people around you. See their reviews, then message or call them yourself. No commission, no middleman.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-3 rounded-[20px] border border-line bg-white p-3 text-left shadow-md md:flex-row md:items-center" role="search">
            <div className="flex flex-1 items-center gap-3 px-2">
              <Search className="h-6 w-6 flex-none text-teal" aria-hidden />
              <div className="min-w-0 flex-1">
                <label htmlFor="hero-q" className="sr-only">Search for any service</label>
                <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for any service" className="h-9 w-full min-w-0 border-0 bg-transparent text-base font-medium placeholder:text-ink focus-visible:ring-0 focus-visible:ring-offset-0" />
                <p className="text-xs text-muted">Electrician, tutor, photographer&hellip;</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:w-64 md:border-l md:border-line md:pl-3"><MapPin className="hidden h-5 w-5 flex-none text-teal md:block" aria-hidden /><LocationPicker className="flex-1" /></div>
            <Button type="submit" size="lg" className="rounded-[14px]">Search</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-navy">Browse all services<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </div>
      </section>

      <section className="container-page pt-10" aria-label="Categories">
        <QueryBoundary query={cats} skeleton={<ul className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <li key={i}><Skeleton className="h-[104px] rounded-[16px]" /></li>)}</ul>} isEmpty={(d) => d.length === 0} empty={<p className="text-center text-sm text-subtle">Categories will appear here soon.</p>}>
          {(list) => <CategoryTiles groups={list.filter((c) => !c.parentId)} citySlug={location.citySlug} />}
        </QueryBoundary>
      </section>

      <section className="container-page pt-14" aria-labelledby="how">
        <h2 id="how" className="mb-6 text-2xl font-bold tracking-tight">How it works</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Steps title="For customers" steps={[
            { icon: <Search className="h-5 w-5" />, title: 'Search', text: 'Find professionals near you by service, distance, rating and who is available now.' },
            { icon: <Scale className="h-5 w-5" />, title: 'Compare', text: 'Put up to three side by side: ratings, prices, status and verification.' },
            { icon: <MessageSquare className="h-5 w-5" />, title: 'Chat or call directly', text: 'Message in the app, or show their phone number and call. No middleman fees.' },
          ]} />
          <Steps title="For professionals" steps={[
            { icon: <UserPlus className="h-5 w-5" />, title: 'List your profile', text: 'Add services, prices and your best work. Drafts are free.' },
            { icon: <Activity className="h-5 w-5" />, title: 'Set your status', text: 'Available, Busy or Away, so customers know when to reach you.' },
            { icon: <Wallet className="h-5 w-5" />, title: 'Get contacted', text: 'Customers chat or call you directly. Keep every rupee you earn.' },
          ]} />
        </div>
      </section>

      <section className="container-page pt-14">
        <div className="rounded-xl bg-navy p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold" style={{ color: '#fff' }}>Are you a professional?</h2>
              <p className="mt-2 text-[#CBD5E1]">Reach customers in your neighbourhood. No commissions on your jobs. One simple subscription.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/pro/onboarding" size="lg" variant="secondary">Create your profile</LinkButton>
              <Link to="/for-professionals" className="inline-flex h-[52px] items-center px-2 font-semibold" style={{ color: '#fff' }}>See pricing</Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
