import React from 'react';
import { View } from 'react-native';
import { Activity, CreditCard, Megaphone, MessageCircle, Star, UserCircle } from 'lucide-react-native';
import type { NotificationCategory, NotificationDto } from '@help/types';
import { colors } from '@/lib/theme';
import { Avatar } from './ui/Avatar';

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  STATUS: 'Status', MESSAGES: 'Messages', REVIEWS: 'Reviews', PAYMENTS: 'Payments', ACCOUNT: 'Account', PROMOTIONS: 'Offers',
};

export function CategoryIcon({ category, size = 20, color = colors.teal }: { category: NotificationCategory; size?: number; color?: string }) {
  const P = { STATUS: Activity, MESSAGES: MessageCircle, REVIEWS: Star, PAYMENTS: CreditCard, ACCOUNT: UserCircle, PROMOTIONS: Megaphone }[category];
  return <P size={size} color={color} />;
}

/** Avatar from imageUrl when present, otherwise a tinted category icon. */
export function NotifLeading({ n, size = 44 }: { n: Pick<NotificationDto, 'imageUrl' | 'category' | 'title'>; size?: number }) {
  if (n.imageUrl) return <Avatar url={n.imageUrl} name={n.title} size={size} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}>
      <CategoryIcon category={n.category} />
    </View>
  );
}
