import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AuthProvider, useAuth } from './lib/auth';
import { canView, type ModuleKey } from './lib/roles';
import { ActionProvider, Card, EmptyState } from './components/ui';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Users } from './pages/Users';
import { Providers } from './pages/Providers';
import { Categories } from './pages/Categories';
import { Verifications } from './pages/Verifications';
import { Plans } from './pages/Plans';
import { Subscriptions, Payments } from './pages/Billing';
import { Reviews } from './pages/Reviews';
import { Reports } from './pages/Reports';
import { Promotions } from './pages/Promotions';
import { Analytics } from './pages/Analytics';
import { AuditLogs } from './pages/AuditLogs';
import { Admins } from './pages/Admins';
import { ForgotPassword, ResetPassword, ChangePassword } from './pages/Password';
import { SupportInbox, SupportDetail } from './pages/Support';
import { BrandLoader } from './components/Brand';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 } } });

function Guard({ module, children }: { module: ModuleKey; children: ReactElement }) {
  const { admin } = useAuth();
  if (!admin) return null;
  if (!canView(admin.role, module)) return <Card><EmptyState title="Not available" hint="Your role does not have access to this module." /></Card>;
  return children;
}

function Protected() {
  const { admin, loading } = useAuth();
  if (loading) return <BrandLoader />;
  if (!admin) return <Navigate to="/login" replace />;
  return <Layout />;
}

const g = (module: ModuleKey, el: ReactElement) => <Guard module={module}>{el}</Guard>;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected />}>
        <Route index element={g('overview', <Overview />)} />
        <Route path="users" element={g('users', <Users />)} />
        <Route path="providers" element={g('providers', <Providers />)} />
        <Route path="categories" element={g('categories', <Categories />)} />
        <Route path="verifications" element={g('verifications', <Verifications />)} />
        <Route path="plans" element={g('plans', <Plans />)} />
        <Route path="subscriptions" element={g('subscriptions', <Subscriptions />)} />
        <Route path="payments" element={g('payments', <Payments />)} />
        <Route path="reviews" element={g('reviews', <Reviews />)} />
        <Route path="reports" element={g('reports', <Reports />)} />
        <Route path="promotions" element={g('promotions', <Promotions />)} />
        <Route path="analytics" element={g('analytics', <Analytics />)} />
        <Route path="audit-logs" element={g('audit', <AuditLogs />)} />
        <Route path="support" element={g('support', <SupportInbox />)} />
        <Route path="support/:id" element={g('support', <SupportDetail />)} />
        <Route path="account/password" element={<ChangePassword />} />
        <Route path="admins" element={g('admins', <Admins />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ActionProvider>
            <App />
          </ActionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
