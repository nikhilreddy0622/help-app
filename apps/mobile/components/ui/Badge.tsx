import React from 'react';
import { View } from 'react-native';
import { Award, Phone, ShieldCheck } from 'lucide-react-native';
import type { VerificationBadges } from '@help/types';
import { colors } from '@/lib/theme';
import { T } from './Text';

/** Distinct verification badges: mobile = phone, ID = shield-check teal, qualification = award navy. */
export function Badge({ kind, label }: { kind: 'mobile' | 'identity' | 'qualification'; label?: string }) {
  const Icon = kind === 'mobile' ? Phone : kind === 'identity' ? ShieldCheck : Award;
  const color = kind === 'qualification' ? colors.navy : colors.teal;
  const text = label ?? (kind === 'mobile' ? 'Mobile' : kind === 'identity' ? 'ID verified' : 'Qualified');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={text}>
      <Icon size={16} color={color} />
      <T v="label" style={{ fontSize: 13 }}>{text}</T>
    </View>
  );
}

export function BadgeRow({ badges, qualificationLabel }: { badges: VerificationBadges; qualificationLabel?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {badges.mobile ? <Badge kind="mobile" /> : null}
      {badges.identity ? <Badge kind="identity" /> : null}
      {badges.qualification ? <Badge kind="qualification" label={qualificationLabel} /> : null}
    </View>
  );
}

export function IdIcon({ badges }: { badges: VerificationBadges }) {
  if (!badges.identity) return null;
  return <ShieldCheck size={16} color={colors.teal} accessibilityLabel="ID verified" />;
}
