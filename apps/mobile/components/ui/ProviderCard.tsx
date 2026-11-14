import React from 'react';
import { Pressable, View } from 'react-native';
import { Check, Heart } from 'lucide-react-native';
import type { ProviderCard as PC } from '@help/types';
import { colors } from '@/lib/theme';
import { distanceLabel, priceLabel } from '@/lib/format';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { IdIcon } from './Badge';
import { PresencePill, StatusNote } from './StatusPill';
import { Rating } from './Rating';
import { T } from './Text';

export function AvailabilityPill({ p }: { p: PC }) {
  return <PresencePill status={p.status} label={p.statusLabel} />;
}

export function ProviderCard({ p, onPress, saved, onToggleSave, compared, onToggleCompare }: { p: PC; onPress: () => void; saved?: boolean; onToggleSave?: () => void; compared?: boolean; onToggleCompare?: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${p.displayName}, ${p.categoryName}`} style={{ gap: 12 }}>
      {p.sponsored ? <T v="overline" style={{ fontSize: 11, marginBottom: -4 }}>Sponsored</T> : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar name={p.displayName} url={p.avatarUrl} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T v="heading" numberOfLines={1} style={{ flexShrink: 1, color: colors.text }}>{p.displayName}</T>
            <IdIcon badges={p.badges} />
          </View>
          <T v="caption" numberOfLines={1}>{p.headline || p.categoryName}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Rating avg={p.ratingAvg} count={p.ratingCount} />
            <T v="caption">{[p.experienceYears ? `${p.experienceYears} yrs` : '', distanceLabel(p.distanceKm)].filter(Boolean).join(' · ')}</T>
          </View>
        </View>
        {onToggleSave ? (
          <Pressable onPress={onToggleSave} hitSlop={8} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save professional'} style={{ width: 36, height: 36, alignItems: 'flex-end' }}>
            <Heart size={20} color={saved ? colors.danger : colors.textMuted} fill={saved ? colors.danger : 'transparent'} />
          </Pressable>
        ) : null}
      </View>
      <StatusNote message={p.statusMessage} updatedAt={p.statusUpdatedAt} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
        <AvailabilityPill p={p} />
        {onToggleCompare ? (
          <Pressable onPress={onToggleCompare} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: !!compared }} accessibilityLabel={`Compare ${p.displayName}`} style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
            <Check size={14} color={compared ? colors.teal700 : colors.textMuted} />
            <T v="micro" color={compared ? colors.teal700 : colors.textMuted}>{compared ? 'Added' : 'Compare'}</T>
          </Pressable>
        ) : null}
        {p.startingPricePaise != null ? (
          <T v="label"><T v="label" color={colors.textMuted}>from </T><T v="label" weight={700}>{priceLabel(p.startingPricePaise, p.startingPriceUnit === 'STARTING_AT' ? null : p.startingPriceUnit).replace(/^from /, '')}</T></T>
        ) : null}
      </View>
    </Card>
  );
}
