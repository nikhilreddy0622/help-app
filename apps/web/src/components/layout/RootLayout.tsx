import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { RealtimeProvider } from '../../state/RealtimeContext';
import { CompareTray } from '../provider/CompareTray';
import { ToastHost } from '../notifications/ToastHost';

export function RootLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <RealtimeProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main" className="flex-1"><Outlet /></main>
        <Footer />
      </div>
      <CompareTray />
      <ToastHost />
    </RealtimeProvider>
  );
}
