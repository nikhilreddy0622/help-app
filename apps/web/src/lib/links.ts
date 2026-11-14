export type Area = 'customer' | 'provider';
export const areaOf = (pathname: string): Area => (pathname === '/pro' || pathname.startsWith('/pro/') ? 'provider' : 'customer');

/** Maps the API's in-app routes (/messages/:id, /provider/status) to web routes. */
export function mapLink(link: string | null | undefined, fallbackArea: Area, data?: Record<string, unknown> | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link)) return null;
  if (link.startsWith('/provider')) return `/pro${link.slice('/provider'.length)}` || '/pro';
  const audience = data && (data.audience === 'provider' || data.role === 'provider') ? 'provider' : undefined;
  const base = (audience ?? fallbackArea) === 'provider' ? '/pro' : '/account';
  if (link.startsWith('/messages')) return `${base}${link}`;
  if (link.startsWith('/saved') || link.startsWith('/settings')) return `/account${link}`;
  if (link.startsWith('/reviews')) return `${base}/messages`;
  return link.startsWith('/') ? link : null;
}
