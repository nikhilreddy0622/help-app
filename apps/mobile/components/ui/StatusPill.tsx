import React from 'react';
import { View } from 'react-native';
import { presenceStyle } from '@help/ui-tokens';
import type { PresenceStatus } from '@help/types';
import { updatedAgo } from '@help/domain';
import { colors } from '@/lib/theme';
import { T } from './Text';

export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg, alignSelf: 'flex-start', justifyContent: 'center' }}>
      <T v="micro" color={fg}>{label}</T>
    </View>
  );
}

/** Presence pill: coloured dot + the server-provided label (e.g. "Busy · back 6:00 PM"). */
export function PresencePill({ status, label, paused }: { status: PresenceStatus; label: string; paused?: boolean }) {
  const s = presenceStyle[paused ? 'PAUSED' : status];
  return (
    <View accessible accessibilityLabel={label} style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: s.bg, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.dot }} />
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
      {message ? <T v="caption" color={colors.textSubtle}>{message}</T> : null}
      {ago ? <T v="caption" style={{ fontSize: 12 }}>{ago}</T> : null}
    </View>
  );
}
