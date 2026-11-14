import { Link } from 'react-router-dom';
import { BRAND } from '@help/ui-tokens';
import { Logo } from '../brand/Brand';

const cols: { title: string; links: [string, string][] }[] = [
  { title: 'Discover', links: [['/search', 'Find professionals'], ['/c/electrician/bengaluru', 'Electricians'], ['/c/tutor/bengaluru', 'Tutors'], ['/c/photographer/bengaluru', 'Photographers']] },
  { title: 'Professionals', links: [['/for-professionals', 'Pricing and plans'], ['/pro/onboarding', 'Create your profile'], ['/pro', 'Professional area']] },
  { title: 'Help', links: [['/help', 'Help centre'], ['/support', 'Contact support'], ['/support/new', 'Report a problem']] },
  { title: 'Legal', links: [['/legal/terms', 'Terms of use'], ['/legal/privacy', 'Privacy (DPDP)'], ['/legal/cancellation-refund', 'Cancellation and refund'], ['/legal/grievance', 'Grievance officer']] },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-subtle">{BRAND.tagline}. Free for customers.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold text-navy">{c.title}</h2>
            <ul className="mt-3 space-y-2">{c.links.map(([to, label]) => <li key={to}><Link to={to} className="text-sm text-subtle hover:text-teal-800">{label}</Link></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-divider py-4 text-center text-xs text-muted">© {new Date().getFullYear()} help. All rights reserved.</div>
    </footer>
  );
}
