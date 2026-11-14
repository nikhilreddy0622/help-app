import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ApiClient } from '@help/api-client';
import { ApiProvider } from './lib/api';
import { SiteProvider } from './state/SiteContext';
import { AuthProvider } from './state/AuthContext';
import { LocationProvider } from './state/LocationContext';
import { CompareProvider } from './state/CompareContext';

export const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

/** Providers shared by the browser entry and the SSR entry. */
export function AppProviders({ qc, api, origin, children }: { qc: QueryClient; api: ApiClient; origin: string; children: ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <ApiProvider value={api}>
        <SiteProvider value={{ origin }}>
          <AuthProvider>
            <LocationProvider><CompareProvider>{children}</CompareProvider></LocationProvider>
          </AuthProvider>
        </SiteProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
