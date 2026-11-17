import React from 'react';
import { Home, Search, Briefcase, UserRound, UserPlus } from 'lucide-react-native';
import { ModeTabs } from '@/components/TabBar';
import { useT } from '@/lib/i18n';

export default function CustomerTabs() {
  const t = useT();
  return (
    <ModeTabs
      mode="customer"
      redirect="/dashboard"
      tabs={[
        { name: 'index', title: t('Home'), icon: (p) => <Home {...p} /> },
        { name: 'explore', title: t('Explore'), icon: (p) => <Search {...p} /> },
        { name: 'register', title: t('Register'), icon: (p) => <UserPlus {...p} /> },
        { name: 'jobs', title: t('Jobs'), icon: (p) => <Briefcase {...p} /> },
        { name: 'profile', title: t('Profile'), icon: (p) => <UserRound {...p} /> },
      ]}
      hidden={['messages', 'saved']}
    />
  );
}
