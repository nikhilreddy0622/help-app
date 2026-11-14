import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Seo } from '../components/ui/Seo';
import { EmptyState } from '../components/ui/States';
import { LinkButton } from '../components/ui/Button';

interface Faq { q: string; a: string }
const FAQ: Record<string, Faq[]> = {
  'Finding and contacting': [
    { q: 'How do I contact a professional?', a: 'Open a profile and tap Chat to send a first message, or tap Show phone number to call directly. You need to be signed in. help is a directory: you agree the job and price with the professional yourself.' },
    { q: 'What do the Available, Busy and Away labels mean?', a: 'Professionals set their own status. Available means they are taking new work. Busy or Away shows when they expect to be back. You can still message them and they reply when they can. "Updated 2h ago" shows how recent the status is.' },
    { q: 'Why can I not see a phone number?', a: 'Phone numbers are shown only to signed-in customers who tap Show phone number, and some professionals choose chat only.' },
    { q: 'What is an auto-reply?', a: 'When a professional is Busy or Away they can send an automatic reply to new chats. These are labelled Auto-reply in the chat.' },
    { q: 'Can I compare professionals?', a: 'Yes. Tap Compare on up to three cards in search or your saved list, then open the comparison table.' },
    { q: 'How do I leave a review?', a: 'After you chat with a professional and they reply, you can review them from the chat or their profile. Reviews are labelled Contacted via help.' },
  ],
  'Payments and subscriptions': [
    { q: 'Do customers pay to use help?', a: 'No. help is free for customers. You pay the professional directly for their work.' },
    { q: 'How does the professional subscription work?', a: 'Building a profile is free. A subscription makes you discoverable and lets customers contact you. Payments are handled securely by Razorpay.' },
    { q: 'My payment went through but my plan is not active.', a: 'Your plan switches on only after our server confirms the payment. This usually takes a few seconds. If it takes longer, it activates automatically once confirmed. If it still does not, contact support from this page.' },
    { q: 'What happens if a payment fails?', a: 'You get a 3-day grace period with full access. Your profile, reviews and conversations are never deleted.' },
    { q: 'Where are my receipts?', a: 'Open Subscription and billing in the professional area and choose Receipt next to any payment.' },
  ],
  Safety: [
    { q: 'How are professionals verified?', a: 'Badges show exactly what was checked: mobile number, government ID and qualification. They are shown separately so you know what each one means.' },
    { q: 'How do I report a profile or block a professional?', a: 'Use Report or Block on the professional profile. Reports are reviewed by our team.' },
    { q: 'I feel unsafe or something went wrong during a job.', a: 'If you are in danger, contact local emergency services first. Then raise a support ticket with the Safety category so our team can act.' },
  ],
  'Account and privacy': [
    { q: 'How do I sign in?', a: 'Use Google, your phone number or your email. All three can be linked to the same account in Settings.' },
    { q: 'I lost access to my phone.', a: 'Sign in with your email or Google account, then open Settings, Linked accounts and link your new phone number.' },
    { q: 'How do I export or delete my data?', a: 'Go to Settings, Data and privacy. You can download your data or delete your account there.' },
    { q: 'Who can see my details?', a: 'Your phone and email are never shown on public pages. See the privacy policy for details.' },
  ],
  'For professionals': [
    { q: 'How do I get started?', a: 'Create your profile in 8 short steps. Your progress is saved as a draft. You can preview your public page before going live.' },
    { q: 'Why is my profile not showing in search?', a: 'Profiles appear in search when published with an active subscription and shown to customers. Check your dashboard for missing items, a subscription notice, or whether Show my profile to customers is switched on.' },
    { q: 'How do I let customers know I am busy?', a: 'Set your status on the dashboard to Busy or Away, add a note and choose when you are back. You can also pause your profile entirely.' },
    { q: 'How do I cancel my subscription?', a: 'Go to Subscription and billing and choose Cancel renewal. You keep access until the end of the paid period.' },
  ],
};

export default function Help() {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    return Object.entries(FAQ).map(([title, items]) => [title, t ? items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(t)) : items] as const).filter(([, items]) => items.length > 0);
  }, [q]);
  return (
    <div className="container-page max-w-3xl py-10">
      <Seo title="Help centre" description="Answers about finding professionals, payments, safety, your account and being a professional on help." path="/help" />
      <h1 className="text-3xl font-bold tracking-tight">How can we help?</h1>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal" aria-hidden />
        <label htmlFor="faq-q" className="sr-only">Search help articles</label>
        <input id="faq-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for answers" className="h-12 w-full rounded-lg border border-line-strong bg-white pl-10 pr-3 text-[15px]" />
      </div>
      <p className="sr-only" aria-live="polite">{groups.reduce((n, [, i]) => n + i.length, 0)} articles found</p>
      {groups.length === 0 ? (
        <div className="mt-8"><EmptyState title="No answers found" text="Try different words, or ask us directly." action={<LinkButton to="/support/new">Contact support</LinkButton>} /></div>
      ) : groups.map(([title, items]) => (
        <section key={title} className="mt-8" aria-labelledby={`h-${title}`}>
          <h2 id={`h-${title}`} className="mb-3 text-lg font-semibold">{title}</h2>
          <div className="card divide-y divide-divider">
            {items.map((i) => (
              <details key={i.q} className="group p-4" open={!!q.trim()}>
                <summary className="cursor-pointer list-none font-medium text-navy">{i.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-subtle">{i.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <div className="card mt-10 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold">Still need help?</h2><p className="text-sm text-subtle">Send us a message. Replies appear right here in the app.</p></div>
        <div className="flex gap-2"><LinkButton to="/support/new">Contact support</LinkButton><LinkButton to="/support" variant="secondary">My tickets</LinkButton></div>
      </div>
      <p className="mt-6 text-sm text-subtle">See also <Link to="/legal/terms">Terms</Link>, <Link to="/legal/privacy">Privacy</Link>, <Link to="/legal/cancellation-refund">Cancellation and refund</Link>.</p>
    </div>
  );
}
