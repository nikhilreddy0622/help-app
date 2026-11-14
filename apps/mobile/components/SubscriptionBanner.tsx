import React from 'react';
import { Pressable, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import type { SubscriptionDto } from '@help/types';
import { colors } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { T } from './ui/Text';

export function SubscriptionBanner({ sub, onPress }: { sub: SubscriptionDto | null; onPress: () => void }) {
  let tone: 'warn' | 'info' | null = null; let title = ''; let body = '';
  if (!sub || sub.status === 'INCOMPLETE') { tone = 'info'; title = 'Choose a plan to go live'; body = 'Your profile is a draft. An active plan makes it visible and lets customers contact you.'; }
  else if (sub.status === 'PENDING') { tone = 'info'; title = 'Confirming your payment'; body = 'Your plan activates once our server confirms the payment. This usually takes a few seconds.'; }
  else if (sub.status === 'PAST_DUE') { tone = 'warn'; title = 'Payment failed'; body = sub.graceEndsAt ? `Your profile stays visible until ${formatDate(sub.graceEndsAt)}. Update your payment to avoid being hidden.` : 'Update your payment to keep your profile visible.'; }
  else if (['CANCELLED', 'EXPIRED', 'HALTED'].includes(sub.status) && !sub.entitled) { tone = 'warn'; title = 'Your profile is hidden'; body = 'Your plan is not active, so you are not shown in search. Your reviews and data are safe. Renew to go live again.'; }
  else if (sub.cancelAtPeriodEnd) { tone = 'info'; title = 'Renewal is off'; body = sub.currentPeriodEnd ? `Your plan stays active until ${formatDate(sub.currentPeriodEnd)}.` : 'Your plan will not renew.'; }
  if (!tone) return null;
  const warn = tone === 'warn';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: warn ? colors.warningBg : colors.infoBg }}>
      {warn ? <AlertTriangle size={20} color={colors.warningFg} /> : <Info size={20} color={colors.infoFg} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" weight={600} color={warn ? colors.warningFg : colors.infoFg}>{title}</T>
        <T v="caption" color={warn ? colors.warningFg : colors.infoFg}>{body}</T>
      </View>
    </Pressable>
  );
}
