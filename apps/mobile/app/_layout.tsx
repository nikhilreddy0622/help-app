import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { colors } from '@/lib/theme';
import { SessionProvider, useSession } from '@/lib/session';
import { LocationProvider } from '@/lib/location';
import { RealtimeProvider } from '@/lib/realtime';
import { configureNotifications } from '@/lib/push';
import { CompareProvider } from '@/lib/compare';
import { I18nProvider } from '@/lib/i18n';
import { BrandLoader } from '@/components/Logo';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
configureNotifications();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000, refetchOnReconnect: true } },
});

function Gate() {
  const { ready } = useSession();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return <BrandLoader />;
  return (
    <RealtimeProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RealtimeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <I18nProvider>
              <LocationProvider>
                <CompareProvider>
                  <StatusBar style="dark" />
                  <Gate />
                </CompareProvider>
              </LocationProvider>
            </I18nProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
