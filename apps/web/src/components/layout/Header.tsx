import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LifeBuoy, ChevronDown, LogOut, Menu, Settings, X, Briefcase, User } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { areaOf } from '../../lib/links';
import { Avatar } from '../ui/Bits';
import { useFocusTrap } from '../ui/Modal';
import { Logo } from '../brand/Brand';
import { NotificationBell } from '../notifications/NotificationBell';

const navLink = ({ isActive }: { isActive: boolean }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-tint text-teal-800' : 'text-subtle hover:bg-surface'}`;

function AreaSwitch() {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const area = areaOf(pathname);
  if (!me) return null;
  if (!me.hasProviderProfile) {
    return <Link to="/pro/onboarding" className="hidden rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium lg:inline-block" style={{ color: '#172B4D' }}>Become a professional</Link>;
  }
  const seg = (active: boolean) => `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${active ? 'bg-white text-navy shadow-sm' : 'text-subtle'}`;
  return (
    <div role="group" aria-label="Switch area" className="hidden items-center gap-1 rounded-lg bg-surface p-1 md:flex">
      <Link to="/account" aria-current={area === 'customer' ? 'page' : undefined} className={seg(area === 'customer')} style={{ color: area === 'customer' ? '#172B4D' : '#475569' }}><User className="h-4 w-4" aria-hidden />Customer</Link>
      <Link to="/pro" aria-current={area === 'provider' ? 'page' : undefined} className={seg(area === 'provider')} style={{ color: area === 'provider' ? '#172B4D' : '#475569' }}><Briefcase className="h-4 w-4" aria-hidden />Professional</Link>
    </div>
  );
}

function AccountMenu() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  if (!me) return null;
  const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface';
  return (
    <div ref={wrap} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full p-1 pr-2 text-navy hover:bg-surface">
        <Avatar name={me.name ?? 'Me'} src={me.avatarUrl} size={32} /><ChevronDown className="h-4 w-4" aria-hidden /><span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div ref={panel} role="menu" tabIndex={-1} className="absolute right-0 top-12 z-50 w-60 rounded-lg border border-line bg-white p-1.5 shadow-md">
          <div className="border-b border-divider px-3 py-2"><p className="truncate text-sm font-semibold text-navy">{me.name ?? 'Your account'}</p><p className="truncate text-xs text-subtle">{me.email ?? me.phone}</p></div>
          <Link role="menuitem" to="/account" className={item} onClick={() => setOpen(false)} style={{ color: '#1E293B' }}><User className="h-4 w-4" aria-hidden />Customer area</Link>
          {me.hasProviderProfile && <Link role="menuitem" to="/pro" className={item} onClick={() => setOpen(false)} style={{ color: '#1E293B' }}><Briefcase className="h-4 w-4" aria-hidden />Professional area</Link>}
          <Link role="menuitem" to="/support" className={item} onClick={() => setOpen(false)} style={{ color: '#1E293B' }}><LifeBuoy className="h-4 w-4" aria-hidden />Support</Link>
          <Link role="menuitem" to="/account/settings" className={item} onClick={() => setOpen(false)} style={{ color: '#1E293B' }}><Settings className="h-4 w-4" aria-hidden />Settings</Link>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); void signOut(); }}><LogOut className="h-4 w-4" aria-hidden />Log out</button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { status, me } = useAuth();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  const area = areaOf(loc.pathname);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        {area === 'provider' && me && <span className="hidden rounded-md bg-teal-tint px-2 py-0.5 text-xs font-semibold text-teal-800 sm:inline">Professional</span>}
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/search" className={navLink}>Find professionals</NavLink>
          <NavLink to="/for-professionals" className={navLink}>For professionals</NavLink>
          <NavLink to="/help" className={navLink}>Help</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <AreaSwitch />
          {status === 'authed' && <NotificationBell />}
          {status === 'authed' ? <AccountMenu /> : status === 'anon' ? (
            <Link to="/login" className="inline-flex h-9 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold hover:bg-teal-800" style={{ color: '#fff' }}>Log in</Link>
          ) : <span className="h-9 w-20" aria-hidden />}
          <button type="button" className="rounded-md p-2 text-navy hover:bg-surface md:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {menu && (
        <nav aria-label="Mobile" className="border-t border-line px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col">
            {[['/search', 'Find professionals'], ['/for-professionals', 'For professionals'], ['/help', 'Help'], ...(me ? [['/account', 'Customer area'], [me.hasProviderProfile ? '/pro' : '/pro/onboarding', me.hasProviderProfile ? 'Professional area' : 'Become a professional']] : [])].map(([to, label]) => (
              <Link key={to} to={to as string} className="rounded-md px-2 py-3 text-[15px] font-medium" style={{ color: '#172B4D' }}>{label}</Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
