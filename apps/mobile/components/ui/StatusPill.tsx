import React from 'react';
import { View } from 'react-native';
import { presenceStyle } from '@help/ui-tokens';
import type { PresenceStatus } from '@help/types';
import { updatedAgo } from '@help/domain';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: bg, alignSelf: 'flex-start', justifyContent: 'center' }}>
      <T v="micro" color={fg}>{label}</T>
    </View>
  );
}

/** The signature detail: a status dot + the server label ("Available now", "Busy · back 6:00 PM"). */
export function PresencePill({ status, label, paused, plain }: { status: PresenceStatus; label: string; paused?: boolean; plain?: boolean }) {
  const s = presenceStyle[paused ? 'PAUSED' : status];
  return (
    <View accessible accessibilityLabel={label} style={{ height: 24, paddingHorizontal: plain ? 0 : 10, borderRadius: 12, backgroundColor: plain ? 'transparent' : s.bg, alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.dot }} />
      <T v="micro" color={s.fg} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
    </View>
  );
}

/** Provider's own note plus "Updated 2h ago". */
export function StatusNote({ message, updatedAt }: { message: string | null; updatedAt: string | null }) {
  const ago = updatedAt ? updatedAgo(new Date(updatedAt), new Date()) : null;
  if (!message && !ago) return null;
  return (
    <View style={{ gap: 2 }}>
      {message ? <T v="caption" color={colors.textSubtle}>“{message}”</T> : null}
      {ago ? <T v="caption" style={{ fontSize: 12 }}>{ago}</T> : null}
    </View>
  );
}
