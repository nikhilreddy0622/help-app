import React from 'react';
import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { colors } from '@/lib/theme';
import { useSession, type Mode } from '@/lib/session';

export interface TabDef { name: string; title: string; icon: (p: { color: string; size: number }) => React.ReactNode; badge?: number }

/** Shared tab navigator. Redirects when the saved mode does not match the tab group.
 *  `hidden` lists routes that live in the group but should NOT show as tabs (reachable by navigation only). */
export function ModeTabs({ mode, tabs, redirect, hidden = [] }: { mode: Mode; tabs: TabDef[]; redirect: string; hidden?: string[] }) {
  const { mode: current } = useSession();
  if (current !== mode) return <Redirect href={redirect as never} />;
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: '#8A909A',
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginTop: 2 },
        tabBarStyle: { backgroundColor: colors.white, borderTopWidth: 0, minHeight: 64, paddingTop: 6, elevation: 16, shadowColor: '#0B1220', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 } },
        tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#fff', fontSize: 10 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.tealTint : 'transparent' }}>
                {t.icon({ color: String(color), size: Math.min(size, 22) })}
              </View>
            ),
            tabBarBadge: t.badge ? t.badge : undefined,
            tabBarAccessibilityLabel: t.badge ? `${t.title}, ${t.badge} new` : t.title,
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
