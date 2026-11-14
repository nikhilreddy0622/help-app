import React from 'react';
import { Heart, Home, MessageCircle, Search, UserRound } from 'lucide-react-native';
import { ModeTabs } from '@/components/TabBar';
import { useRealtime } from '@/lib/realtime';

export default function CustomerTabs() {
  const { unread } = useRealtime();
  return (
    <ModeTabs
      mode="customer"
      redirect="/dashboard"
      tabs={[
        { name: 'index', title: 'Home', icon: (p) => <Home {...p} /> },
        { name: 'explore', title: 'Explore', icon: (p) => <Search {...p} /> },
        { name: 'messages', title: 'Messages', icon: (p) => <MessageCircle {...p} />, badge: unread.byCategory.MESSAGES },
        { name: 'saved', title: 'Saved', icon: (p) => <Heart {...p} /> },
        { name: 'profile', title: 'Profile', icon: (p) => <UserRound {...p} /> },
      ]}
    />
  );
}
