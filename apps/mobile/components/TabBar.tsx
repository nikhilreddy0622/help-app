import React from 'react';
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
        tabBarActiveTintColor: colors.teal700,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, minHeight: 60 },
        tabBarBadgeStyle: { backgroundColor: colors.teal700, color: '#fff', fontSize: 10 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => t.icon({ color: String(color), size: Math.min(size, 24) }), tabBarBadge: t.badge ? t.badge : undefined, tabBarAccessibilityLabel: t.badge ? `${t.title}, ${t.badge} new` : t.title }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
