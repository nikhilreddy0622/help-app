import React from 'react';
import { Home, Search, Briefcase, UserRound, UserPlus } from 'lucide-react-native';
import { ModeTabs } from '@/components/TabBar';

export default function CustomerTabs() {
  return (
    <ModeTabs
      mode="customer"
      redirect="/dashboard"
      tabs={[
        { name: 'index', title: 'Home', icon: (p) => <Home {...p} /> },
        { name: 'explore', title: 'Explore', icon: (p) => <Search {...p} /> },
        { name: 'register', title: 'Register', icon: (p) => <UserPlus {...p} /> },
        { name: 'jobs', title: 'Jobs', icon: (p) => <Briefcase {...p} /> },
        { name: 'profile', title: 'Profile', icon: (p) => <UserRound {...p} /> },
      ]}
    />
  );
}
