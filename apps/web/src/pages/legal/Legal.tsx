import { useParams } from 'react-router-dom';
import { Seo } from '../../components/ui/Seo';
import { EmptyState } from '../../components/ui/States';
import { LinkButton } from '../../components/ui/Button';

type Section = [string, string];
const PAGES: Record<string, { title: string; intro: string; sections: Section[] }> = {
  terms: {
    title: 'Terms of use', intro: 'These terms govern your use of help as a customer or professional.',
    sections: [
      ['Who can use help', 'You must be 18 or older and provide accurate information. One person has one account, which can act as both customer and professional.'],
      ['The directory', 'help helps customers discover and contact professionals. Professionals are independent. help does not take part in agreements, prices or payments between customers and professionals.'],
      ['Professional subscriptions', 'Professionals pay a subscription to be discoverable and be contacted by customers. Subscription status changes only after server-verified payment confirmation.'],
      ['Reviews and conduct', 'Reviews come only from customers who contacted a professional through help. Abuse, fraud or fake profiles may lead to suspension.'],
      ['Liability', 'Details to be finalised.'],
    ],
  },
  privacy: {
    title: 'Privacy policy (DPDP)', intro: 'How we handle personal data under the Digital Personal Data Protection Act, 2023.',
    sections: [
      ['Data we collect', 'Account details (name, email, phone), profile information, messages between you and a professional, device and usage data, and verification documents submitted by professionals.'],
      ['Why we use it', 'To run the marketplace, show relevant professionals near you, process subscriptions, send notifications and keep the platform safe.'],
      ['What is public', 'A professional public profile never shows private email or home address. A phone number is shown to a signed-in customer only when they tap Show phone number, and the professional can turn this off.'],
      ['Your rights', 'You can access, correct, export and delete your personal data from Settings > Data and privacy, and you can withdraw consent at any time.'],
      ['Retention and sharing', 'Retention periods and processor list to be finalised. We never store card details; payments are handled by Razorpay.'],
      ['Grievances', 'Contact the Grievance Officer listed on the grievance page.'],
    ],
  },
  'cancellation-refund': {
    title: 'Cancellation and refund policy', intro: 'How cancellations and refunds work for professional subscriptions.',
    sections: [
      ['Subscriptions', 'You can turn off renewal at any time. Access continues until the end of the paid period. If a payment fails, a 3-day grace period applies before the profile is hidden.'],
      ['Refunds', 'Refund eligibility, timelines and exceptions to be finalised.'],
    ],
  },
  grievance: {
    title: 'Grievance officer', intro: 'Contact us about complaints, privacy requests or content concerns.',
    sections: [
      ['Grievance Officer', 'Name: [To be appointed]\nEmail: [grievance@example.com]\nAddress: [Registered office address]'],
      ['Response time', 'We aim to acknowledge complaints within 48 hours and resolve them within 30 days. Final timelines to be confirmed.'],
      ['How to complain', 'Write to the email above with your account details, a description of the issue and any evidence.'],
    ],
  },
};

export default function Legal() {
  const { doc = '' } = useParams();
  const page = PAGES[doc];
  if (!page) return <div className="container-page py-12"><Seo title="Page not found" noindex /><EmptyState title="Page not found" action={<LinkButton to="/">Go home</LinkButton>} /></div>;
  return (
    <div className="container-page max-w-3xl py-10">
      <Seo title={page.title} description={page.intro} path={`/legal/${doc}`} />
      <p role="note" className="mb-6 rounded-md bg-warning-bg p-3 text-sm font-semibold text-warning-fg">[Pending legal review] This is placeholder text and not final legal advice or policy.</p>
      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <p className="mt-2 text-subtle">{page.intro}</p>
      {page.sections.map(([h, t]) => (
        <section key={h} className="mt-8"><h2 className="text-lg font-semibold">{h}</h2><p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{t} <span className="text-warning-fg">[Pending legal review]</span></p></section>
      ))}
      <nav aria-label="Other policies" className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-sm">
        {Object.entries(PAGES).filter(([k]) => k !== doc).map(([k, p]) => <a key={k} href={`/legal/${k}`} className="font-semibold">{p.title}</a>)}
      </nav>
    </div>
  );
}
