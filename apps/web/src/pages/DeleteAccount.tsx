import { Link } from 'react-router-dom';
import { Smartphone, Globe, Mail } from 'lucide-react';
import { LEGAL_CONTACT } from '@help/domain';
import { Seo } from '../components/ui/Seo';

const WAYS = [
  { icon: Smartphone, title: 'In the help app', steps: ['Open the app and sign in.', 'Tap Profile, then Privacy and data.', 'Tap Delete my account and confirm.'] },
  { icon: Globe, title: 'On the website', steps: ['Log in at helpbharath.com.', 'Open Settings, then Data and privacy.', 'Click Delete my account and confirm.'] },
  { icon: Mail, title: 'By email (if you cannot sign in)', steps: [`Write to ${LEGAL_CONTACT.email} from the email linked to your account, or include the phone number you signed up with.`, 'Use the subject "Delete my account".', 'We confirm it is you and delete the account within 7 days.'] },
];

/** Public page (no login) explaining how to delete an account; linked from the Play Store Data safety form. */
export default function DeleteAccount() {
  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <Seo title="Delete your help account" description="How to delete your help account and personal data from the app, the website or by email, and what happens to your data." path="/delete-account" />
      <h1 className="text-3xl md:text-4xl">Delete your help account</h1>
      <p className="mt-3 text-lg text-subtle">You can delete your account and personal data at any time. Choose whichever way is easiest.</p>

      <div className="mt-8 grid gap-4">
        {WAYS.map((w) => (
          <section key={w.title} className="card p-5">
            <h2 className="flex items-center gap-3 text-lg"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-tint text-brand"><w.icon className="h-5 w-5" aria-hidden /></span>{w.title}</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-ink">{w.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </section>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-xl">What gets deleted</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-ink">
          <li>Your profile, name, phone number, email and photos</li>
          <li>Your saved professionals, searches and notification settings</li>
          <li>Your chats, removed from your account</li>
          <li>For professionals: your public profile, services, work photos and verification documents. It disappears from search straight away.</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-xl">What we keep, and for how long</h2>
        <p className="mt-3 text-ink">Personal data is deleted or anonymised within 30 days. We keep payment and tax records for professional subscriptions for up to 8 years where the law requires, and limited records needed to prevent fraud or resolve an open dispute. Reviews you wrote may stay visible without your name.</p>
      </section>
      <p className="mt-10 text-sm text-subtle">Professionals with a subscription: turn off renewal first in Settings, Subscription and plan, so you are not charged again. Read more in our <Link to="/legal/privacy">Privacy policy</Link>.</p>
    </div>
  );
}
