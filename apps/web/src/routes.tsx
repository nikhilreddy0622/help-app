import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { AreaLayout } from './components/layout/AreaLayout';
import { BrandLoader } from './components/brand/Brand';
import Landing from './pages/Landing';
import SearchPage from './pages/Search';
import CategoryCity from './pages/CategoryCity';
import Services from './pages/Services';
import CategoryGroup from './pages/CategoryGroup';
import DeleteAccount from './pages/DeleteAccount';
import ProfilePage from './pages/Profile';
import NotFound from './pages/NotFound';
import ForProfessionals from './pages/ForProfessionals';
import Help from './pages/Help';
import Legal from './pages/legal/Legal';
import { BlogIndex, BlogPost } from './pages/blog/Blog';

// Public SEO routes are eager (server rendered — lazy routes would SSR only their fallback); logged-in areas are code-split.
function lz(load: () => Promise<{ default: ComponentType }>) {
  const C = lazy(load);
  return <Suspense fallback={<BrandLoader />}><C /></Suspense>;
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'services', element: <Services /> },
      { path: 'services/:group', element: <CategoryGroup /> },
      { path: 'c/:categorySlug/:city', element: <CategoryCity /> },
      { path: 'professionals/:slug', element: <ProfilePage /> },
      { path: 'for-professionals', element: <ForProfessionals /> },
      { path: 'legal/:doc', element: <Legal /> },
      { path: 'help', element: <Help /> },
      { path: 'delete-account', element: <DeleteAccount /> },
      { path: 'blog', element: <BlogIndex /> },
      { path: 'blog/:slug', element: <BlogPost /> },
      { path: 'jobs', element: lz(() => import('./pages/jobs/Jobs').then((m) => ({ default: m.JobsList }))) },
      { path: 'jobs/:id', element: lz(() => import('./pages/jobs/Jobs').then((m) => ({ default: m.JobDetailPage }))) },
      { path: 'compare', element: lz(() => import('./pages/Compare')) },
      { path: 'support', element: lz(() => import('./pages/support/Support').then((m) => ({ default: m.SupportList }))) },
      { path: 'support/new', element: lz(() => import('./pages/support/Support').then((m) => ({ default: m.SupportNew }))) },
      { path: 'support/:id', element: lz(() => import('./pages/support/Support').then((m) => ({ default: m.SupportTicket }))) },
      { path: 'login', element: lz(() => import('./pages/Login')) },
      { path: 'notifications', element: lz(() => import('./pages/account/NotificationsPage')) },
      {
        path: 'account', element: <AreaLayout area="customer" />,
        children: [
          { index: true, element: <Navigate to="messages" replace /> },
          { path: 'recent', element: lz(() => import('./pages/account/RecentlyViewed')) },
          { path: 'messages', element: lz(() => import('./pages/account/Messages')) },
          { path: 'messages/:conversationId', element: lz(() => import('./pages/account/Messages')) },
          { path: 'saved', element: lz(() => import('./pages/account/Saved')) },
          { path: 'settings/*', element: lz(() => import('./pages/account/Settings')) },
        ],
      },
      { path: 'pro/onboarding', element: lz(() => import('./pages/pro/Onboarding')) },
      {
        path: 'pro', element: <AreaLayout area="provider" />,
        children: [
          { index: true, element: lz(() => import('./pages/pro/Dashboard')) },
          { path: 'insights', element: lz(() => import('./pages/pro/Insights')) },
          { path: 'settings', element: lz(() => import('./pages/pro/ProSettings')) },
          { path: 'messages', element: lz(() => import('./pages/account/Messages')) },
          { path: 'messages/:conversationId', element: lz(() => import('./pages/account/Messages')) },
          { path: 'profile', element: lz(() => import('./pages/pro/ProfileEditor')) },
          { path: 'subscription', element: lz(() => import('./pages/pro/Subscription')) },
          { path: 'subscription/receipts/:id', element: lz(() => import('./pages/pro/Receipt')) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];
