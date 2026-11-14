import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { hydrate } from '@tanstack/react-query';
import './index.css';
import { AppProviders, makeQueryClient } from './App';
import { routes } from './routes';
import { createBrowserApi } from './lib/api';

const state = window.__APP_STATE__;
const qc = makeQueryClient();
if (state?.rq) hydrate(qc, state.rq);
const router = createBrowserRouter(routes);
const app = (
  <StrictMode>
    <HelmetProvider>
      <AppProviders qc={qc} api={createBrowserApi()} origin={state?.origin ?? window.location.origin}>
        <RouterProvider router={router} />
      </AppProviders>
    </HelmetProvider>
  </StrictMode>
);
const el = document.getElementById('root') as HTMLElement;
// Public routes are server rendered and hydrated; everything else is client rendered.
if (state?.ssr) hydrateRoot(el, app);
else createRoot(el).render(app);
