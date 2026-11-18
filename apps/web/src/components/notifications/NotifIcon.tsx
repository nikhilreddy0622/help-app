import { Activity, CreditCard, MessageSquare, Megaphone, Star, UserCog, Zap, type LucideIcon } from 'lucide-react';
import type { NotificationCategory, NotificationDto } from '@help/types';

export const CATEGORY_META: Record<NotificationCategory, { label: string; icon: LucideIcon }> = {
  STATUS: { label: 'Status', icon: Activity },
  MESSAGES: { label: 'Messages', icon: MessageSquare },
  REVIEWS: { label: 'Reviews', icon: Star },
  PAYMENTS: { label: 'Payments', icon: CreditCard },
  ACCOUNT: { label: 'Account', icon: UserCog },
  PROMOTIONS: { label: 'Offers', icon: Megaphone },
  LIVE_REQUESTS: { label: 'Live requests', icon: Zap },
};
export const CATEGORIES = (Object.keys(CATEGORY_META) as NotificationCategory[]).filter((c) => c !== 'LIVE_REQUESTS');

export function NotifIcon({ n, size = 40 }: { n: Pick<NotificationDto, 'imageUrl' | 'category'>; size?: number }) {
  const Icon = CATEGORY_META[n.category]?.icon ?? Activity;
  if (n.imageUrl) return <img src={n.imageUrl} alt="" width={size} height={size} style={{ width: size, height: size }} className="flex-none rounded-full object-cover" loading="lazy" />;
  return (
    <span aria-hidden style={{ width: size, height: size }} className="flex flex-none items-center justify-center rounded-full bg-teal-tint text-teal">
      <Icon className="h-5 w-5" />
    </span>
  );
}
