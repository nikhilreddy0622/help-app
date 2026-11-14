import type { Href } from 'expo-router';

/** Maps a server in-app link (e.g. /messages/:id) onto an expo-router href. */
export function mapLink(link: string | null | undefined): Href {
  if (!link) return '/notifications';
  const clean = link.split('?')[0] ?? link;
  const seg = clean.split('/').filter(Boolean);
  if (seg[0] === 'messages' && seg[1]) return `/chat/${seg[1]}` as Href;
  if (seg[0] === 'messages') return '/messages' as Href;
  if (seg[0] === 'provider' && seg[1] === 'status') return '/dashboard' as Href;
  if (seg[0] === 'providers' && seg[1]) return `/provider/${seg[1]}` as Href;
  if (seg[0] === 'reviews' && seg[1]) return `/provider/${seg[1]}` as Href;
  if (seg[0] === 'support' && seg[1]) return `/support/${seg[1]}` as Href;
  if (seg[0] === 'support') return '/support' as Href;
  if (seg[0] === 'provider' && seg[1] === 'subscription') return '/subscription' as Href;
  if (seg[0] === 'provider' && seg[1] === 'payments') return '/payments' as Href;
  return '/notifications';
}

/** True when the current route is the screen the link points to. */
export function isCurrentRoute(pathname: string, link: string | null | undefined): boolean {
  if (!link) return false;
  const target = String(mapLink(link));
  return pathname === target || pathname.endsWith(target);
}
