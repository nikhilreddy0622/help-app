import { EMAIL_WORDMARK_HTML } from '@help/ui-tokens';
import { env } from '../config/env';

export type Vars = Record<string, unknown>;
export interface Rendered { subject: string; html: string; text: string }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const str = (v: unknown, d = '') => (v == null || v === '' ? d : String(v));
const inr = (paise: unknown) => `Rs ${(Number(paise ?? 0) / 100).toLocaleString('en-IN')}`;

interface Cta { label: string; /** relative to the web app, or an absolute url on our own domains */ path?: string; url?: string }
interface Spec {
  subject: string;
  title: string;
  /** Paragraphs of body copy (plain text; escaped on render). */
  lines: string[];
  /** Large, spaced code block (OTP). */
  code?: string;
  cta?: Cta;
}

const FOOTER = "You're receiving this because you have a help account. Need help? Open the help app → Support.";

const SPECS: Record<string, (v: Vars) => Spec> = {
  welcome: (v) => ({
    subject: 'Welcome to help',
    title: `Welcome, ${str(v.name, 'there')}`,
    lines: ['Your account is ready. Find trusted professionals near you, or create a profile to start getting enquiries.'],
    cta: { label: 'Get started', path: '/' },
  }),
  'otp-code': (v) => ({
    subject: `${str(v.code)} is your help verification code`,
    title: 'Your verification code',
    lines: ['Enter this code to continue. It expires in 5 minutes. Never share it with anyone - help will never ask for it.'],
    code: str(v.code),
  }),
  'admin-password-reset': (v) => ({
    subject: 'Reset your help admin password',
    title: 'Reset your password',
    lines: ['We received a request to reset your admin password. This link works once and expires in 30 minutes.', "If you didn't ask for this, you can ignore this email."],
    cta: { label: 'Reset password', url: str(v.resetUrl) },
  }),
  'ticket-received': (v) => ({
    subject: `We got your request (#${str(v.number)})`,
    title: `Request #${str(v.number)} received`,
    lines: [`Subject: ${str(v.subject)}`, 'Our support team will reply in the app. You will get a notification when we do.'],
    cta: { label: 'View request', path: `/support/${str(v.ticketId)}` },
  }),
  'ticket-reply': (v) => ({
    subject: `Update on your request (#${str(v.number)})`,
    title: `New reply on request #${str(v.number)}`,
    lines: [str(v.preview, 'Our support team replied to your request.')],
    cta: { label: 'Open conversation', path: `/support/${str(v.ticketId)}` },
  }),
  'subscription-confirmed': (v) => ({
    subject: 'Your profile is live',
    title: 'Subscription active',
    lines: [str(v.body, 'Your plan is active and your profile is visible to customers.')],
    cta: { label: 'Open dashboard', path: '/provider' },
  }),
  'payment-receipt': (v) => ({
    subject: 'Payment receipt',
    title: 'Payment received',
    lines: [`We received ${inr(v.amountPaise)}. Thank you.`],
    cta: v.invoiceUrl && /^https:\/\//.test(str(v.invoiceUrl)) ? { label: 'View invoice', url: str(v.invoiceUrl) } : undefined,
  }),
  'payment-failed': (v) => ({
    subject: 'Action needed: payment failed',
    title: str(v.title, 'Payment failed'),
    lines: [str(v.body, 'We could not renew your plan. Update your payment method to stay visible.')],
    cta: { label: 'Fix payment', path: '/provider/subscription' },
  }),
  'renewal-reminder': (v) => ({
    subject: 'Your plan renews soon',
    title: 'Renewal coming up',
    lines: [str(v.body, 'Your plan renews in 3 days.')],
    cta: { label: 'Manage plan', path: '/provider/subscription' },
  }),
  'subscription-cancelled': (v) => ({
    subject: 'Subscription cancelled',
    title: 'Subscription cancelled',
    lines: [str(v.body, 'Renewals are off. Your profile stays visible until your paid period ends.')],
    cta: { label: 'Resubscribe', path: '/provider/subscription' },
  }),
  'subscription-expired': (v) => ({
    subject: 'Your plan has ended',
    title: 'Subscription ended',
    lines: [str(v.body, 'Your profile and reviews are saved. Resubscribe anytime to go live again.')],
    cta: { label: 'Resubscribe', path: '/provider/subscription' },
  }),
};

export const TEMPLATE_NAMES = Object.keys(SPECS);

const FONT = 'Inter,Segoe UI,Helvetica,Arial,sans-serif';

/** The single branded layout used by every email: 600px card on #F8FAFC, wordmark header, one primary button. */
function layout(spec: Spec, greeting: string, url: string | null): string {
  const p = (t: string, extra = '') => `<tr><td style="padding:0 32px 14px 32px;font-family:${FONT};font-size:15px;line-height:23px;color:#1E293B;${extra}">${esc(t)}</td></tr>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.subject)}</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;">${EMAIL_WORDMARK_HTML}</td></tr>
<tr><td style="padding:16px 32px 12px 32px;font-family:${FONT};font-size:20px;line-height:28px;font-weight:700;color:#172B4D;">${esc(spec.title)}</td></tr>
${p(greeting)}
${spec.lines.map((l) => p(l)).join('\n')}
${spec.code ? `<tr><td align="center" style="padding:8px 32px 20px 32px;"><div style="font-family:'Courier New',monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:#172B4D;background:#F1F5F9;border-radius:8px;padding:14px 8px;">${esc(spec.code)}</div></td></tr>` : ''}
${url ? `<tr><td style="padding:10px 32px 24px 32px;"><a href="${esc(url)}" style="display:inline-block;background:#0F766E;color:#FFFFFF;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">${esc(spec.cta!.label)}</a></td></tr>` : ''}
<tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #E2E8F0;font-family:${FONT};font-size:12px;line-height:18px;color:#64748B;">${esc(FOOTER)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderTemplate(template: string, vars: Vars): Rendered {
  const fallback = (v: Vars): Spec => ({ subject: str(v.title, 'Notification'), title: str(v.title, 'Notification'), lines: [str(v.body)] });
  const spec = (SPECS[template] ?? fallback)(vars);
  const url = spec.cta ? (spec.cta.url ?? `${env.PUBLIC_WEB_URL}${spec.cta.path ?? '/'}`) : null;
  const greeting = `Hi ${str(vars.name, 'there')},`;
  const text = [
    greeting, '', spec.title, '', ...spec.lines, ...(spec.code ? ['', `Code: ${spec.code}`] : []),
    ...(url ? ['', `${spec.cta!.label}: ${url}`] : []), '', '--', FOOTER,
  ].join('\n');
  return { subject: spec.subject, html: layout(spec, greeting, url), text };
}
