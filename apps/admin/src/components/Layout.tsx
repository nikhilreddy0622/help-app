import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, BadgeCheck, ChevronsLeft, ChevronsRight, CreditCard, Flag, LayoutDashboard, LogOut, Megaphone,
  KeyRound, LifeBuoy, Menu, Receipt, ScrollText, Star, Tags, UserCog, Users, Wallet, Briefcase, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { roleModules, type ModuleKey } from '../lib/roles';
import { Logo } from './Brand';
import { humanize } from '../lib/format';

export const NAV: { key: ModuleKey; to: string; label: string; icon: LucideIcon }[] = [
  { key: 'overview', to: '/', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', to: '/users', label: 'Users', icon: Users },
  { key: 'providers', to: '/providers', label: 'Providers', icon: Briefcase },
  { key: 'categories', to: '/categories', label: 'Categories', icon: Tags },
  { key: 'verifications', to: '/verifications', label: 'Verification', icon: BadgeCheck },
  { key: 'plans', to: '/plans', label: 'Plans', icon: CreditCard },
  { key: 'subscriptions', to: '/subscriptions', label: 'Subscriptions', icon: Receipt },
  { key: 'payments', to: '/payments', label: 'Payments', icon: Wallet },
  { key: 'support', to: '/support', label: 'Support desk', icon: LifeBuoy },
  { key: 'reviews', to: '/reviews', label: 'Reviews', icon: Star },
  { key: 'reports', to: '/reports', label: 'Reports', icon: Flag },
  { key: 'promotions', to: '/promotions', label: 'Promotions', icon: Megaphone },
  { key: 'analytics', to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'audit', to: '/audit-logs', label: 'Audit logs', icon: ScrollText },
  { key: 'admins', to: '/admins', label: 'Admins', icon: UserCog },
];

export function Layout() {
  const { admin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  if (!admin) return null;
  const allowed = roleModules[admin.role];
  const items = NAV.filter((n) => allowed.includes(n.key));

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Logo size={28} />
        <button type="button" aria-expanded={open} aria-controls="sidebar" aria-label="Toggle navigation" onClick={() => setOpen((o) => !o)} className="rounded p-1 text-ink hover:bg-slate-100"><Menu className="h-6 w-6" /></button>
      </header>
      <aside
        id="sidebar"
        className={`${open ? 'block' : 'hidden'} flex-col border-r border-line bg-white text-subtle md:sticky md:top-0 md:flex md:h-screen md:shrink-0 ${collapsed ? 'md:w-[72px]' : 'md:w-64'} transition-[width]`}
      >
        <div className="hidden items-center gap-2 px-5 py-5 md:flex">
          <Logo size={32} showWord={!collapsed} />
          {!collapsed && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">Admin</span>}
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map(({ key, to, label, icon: Icon }) => (
            <NavLink
              key={key} to={to} end={to === '/'} title={collapsed ? label : undefined} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-teal-tint font-semibold text-brand-deep shadow-[inset_3px_0_0_theme(colors.brand.DEFAULT)]' : 'hover:bg-slate-100 hover:text-ink'} ${collapsed ? 'md:justify-center' : ''}`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className={collapsed ? 'md:sr-only' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          {!collapsed && (
            <div className="mb-2 px-2 text-xs">
              <div className="truncate font-semibold text-navy">{admin.name}</div>
              <div className="truncate text-muted">{humanize(admin.role)}</div>
            </div>
          )}
          <NavLink to="/account/password" onClick={() => setOpen(false)} className={({ isActive }) => `mb-1 flex w-full items-center gap-3 rounded px-3 py-2 text-sm ${isActive ? 'bg-teal-tint text-brand-deep' : 'hover:bg-slate-100'} ${collapsed ? 'md:justify-center' : ''}`}>
            <KeyRound className="h-5 w-5 shrink-0" aria-hidden /><span className={collapsed ? 'md:sr-only' : ''}>Change password</span>
          </NavLink>
          <button type="button" onClick={logout} className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm hover:bg-slate-100 ${collapsed ? 'md:justify-center' : ''}`}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden /><span className={collapsed ? 'md:sr-only' : ''}>Sign out</span>
          </button>
          <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="mt-1 hidden w-full items-center justify-center rounded px-3 py-2 text-muted hover:bg-slate-100 md:flex">
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-[1400px]"><Outlet /></div>
      </main>
    </div>
  );
}
