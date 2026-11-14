import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Bookmark, CreditCard, Gauge, History, MessageSquare, Settings, UserCog, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useUnread } from '../../state/RealtimeContext';
import { BrandLoader } from '../brand/Brand';
import { Seo } from '../ui/Seo';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: 'messages' | 'notifications' }
const CUSTOMER: NavItem[] = [
  { to: '/account/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { to: '/account/saved', label: 'Saved', icon: Bookmark },
  { to: '/account/recent', label: 'Recently viewed', icon: History },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
  { to: '/account/settings', label: 'Settings', icon: Settings },
];
const PROVIDER: NavItem[] = [
  { to: '/pro', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/pro/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { to: '/pro/insights', label: 'Insights', icon: BarChart3 },
  { to: '/pro/profile', label: 'Profile', icon: UserCog },
  { to: '/pro/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/pro/settings', label: 'Settings', icon: Settings },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
];

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <BrandLoader />;
  if (status === 'anon') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

export function AreaLayout({ area }: { area: 'customer' | 'provider' }) {
  const { me } = useAuth();
  const unread = useUnread();
  const loc = useLocation();
  const items = area === 'provider' ? PROVIDER : CUSTOMER;
  const needsProfile = area === 'provider' && me && !me.hasProviderProfile && !loc.pathname.startsWith('/pro/onboarding');
  return (
    <RequireAuth>
      <Seo title={area === 'provider' ? 'Professional area' : 'My account'} noindex />
      {needsProfile ? <Navigate to="/pro/onboarding" replace /> : (
        <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_1fr] lg:py-8">
          <nav aria-label={area === 'provider' ? 'Professional navigation' : 'Account navigation'} className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {items.map((i) => {
              const n = i.badge === 'notifications' ? unread.count : i.badge === 'messages' ? unread.byCategory.MESSAGES ?? 0 : 0;
              return (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex flex-none items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-teal-tint text-teal-800' : 'text-subtle hover:bg-surface'}`}>
                  <i.icon className="h-[18px] w-[18px]" aria-hidden />{i.label}
                  {n > 0 && <span className="ml-auto rounded-full bg-danger px-1.5 text-[11px] font-bold text-white" aria-label={`${n} unread`}>{n > 99 ? '99+' : n}</span>}
                </NavLink>
              );
            })}
          </nav>
          <div className="min-w-0"><Outlet /></div>
        </div>
      )}
    </RequireAuth>
  );
}
