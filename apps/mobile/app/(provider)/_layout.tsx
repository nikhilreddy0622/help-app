import React from 'react';
import { BarChart3, LayoutDashboard, MessageCircle, Settings, UserRound } from 'lucide-react-native';
import { ModeTabs } from '@/components/TabBar';
import { useRealtime } from '@/lib/realtime';

export default function ProviderTabs() {
  const { unread } = useRealtime();
  return (
    <ModeTabs
      mode="provider"
      redirect="/"
      tabs={[
        { name: 'dashboard', title: 'Dashboard', icon: (p) => <LayoutDashboard {...p} /> },
        { name: 'p-messages', title: 'Messages', icon: (p) => <MessageCircle {...p} />, badge: unread.byCategory.MESSAGES },
        { name: 'insights', title: 'Insights', icon: (p) => <BarChart3 {...p} /> },
        { name: 'p-profile', title: 'Profile', icon: (p) => <UserRound {...p} /> },
        { name: 'p-settings', title: 'Settings', icon: (p) => <Settings {...p} /> },
      ]}
    />
  );
}
