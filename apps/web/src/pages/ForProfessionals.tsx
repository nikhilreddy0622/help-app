import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, CalendarClock, Users, Wallet } from 'lucide-react';
import { useApi } from '../lib/api';
import { Seo } from '../components/ui/Seo';
import { LinkButton } from '../components/ui/Button';
import { QueryBoundary, SkeletonList } from '../components/ui/States';
import { PlanCard } from '../components/subscription/useSubscribe';

export default function ForProfessionals() {
  const api = useApi();
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api.subscriptions.plans(), staleTime: 5 * 60_000 });
  return (
    <>
      <Seo title="For professionals: grow your local business" description="Create a free profile, then subscribe to be discovered by customers near you. No commission on your jobs." path="/for-professionals" />
      <section className="bg-navy"><div className="container-page py-14">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight md:text-5xl" style={{ color: '#fff' }}>Get found by customers in your neighbourhood</h1>
        <p className="mt-4 max-w-xl text-[#CBD5E1]">Build your profile for free. Subscribe when you are ready to go live. Keep every rupee you earn.</p>
        <LinkButton to="/pro/onboarding" size="lg" variant="secondary" className="mt-8">Create your profile</LinkButton>
      </div></section>
      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {[[Users, 'Local customers', 'Appear in searches within your service radius.'], [BadgeCheck, 'Trust badges', 'Mobile, ID and qualification verification.'], [CalendarClock, 'You set the hours', 'Weekly availability and time off, your way.'], [Wallet, 'No commissions', 'Customers pay you directly. One flat subscription.']].map(([I, t, d]) => {
            const Icon = I as typeof Users;
            return <div key={t as string} className="card p-5"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-tint text-teal"><Icon className="h-5 w-5" aria-hidden /></span><h2 className="mt-3 font-semibold">{t as string}</h2><p className="mt-1 text-sm text-subtle">{d as string}</p></div>;
          })}
        </div>
        <h2 className="mb-5 mt-14 text-2xl font-bold tracking-tight">Simple pricing</h2>
        <QueryBoundary query={q} skeleton={<SkeletonList rows={2} height="h-52" />} isEmpty={(d) => d.length === 0} empty={<p className="text-subtle">Plans will be announced soon.</p>}>
          {(plans) => <div className="grid gap-4 md:grid-cols-2 lg:max-w-3xl">{plans.map((p) => <PlanCard key={p.id} plan={p} />)}</div>}
        </QueryBoundary>
        <ul className="mt-6 max-w-2xl list-inside list-disc space-y-1 text-sm text-subtle">
          <li>Drafting your profile is free. A subscription is needed to be discoverable and to be contacted by customers.</li>
          <li>If a payment fails you get a 3-day grace period. Your profile and reviews are never deleted.</li>
          <li>Cancel renewal anytime. You keep access until the end of the paid period.</li>
        </ul>
        <LinkButton to="/pro/onboarding" size="lg" className="mt-8">Get started</LinkButton>
      </section>
    </>
  );
}
