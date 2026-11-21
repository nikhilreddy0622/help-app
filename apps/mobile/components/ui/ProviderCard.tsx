import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { BadgeCheck, Check, Heart, MapPin } from 'lucide-react-native';
import type { ProviderCard as PC } from '@help/types';
import { colors, tileColor } from '@/lib/theme';
import { distanceLabel, initials, priceLabel } from '@/lib/format';
import { Card } from './Card';
import { PresencePill } from './StatusPill';
import { Rating } from './Rating';
import { T } from './Text';

export function AvailabilityPill({ p }: { p: PC }) {
  return <PresencePill status={p.status} label={p.statusLabel} />;
}

const price = (p: PC) => (p.startingPricePaise == null ? null : priceLabel(p.startingPricePaise, p.startingPriceUnit === 'STARTING_AT' ? null : p.startingPriceUnit).replace(/^from /, ''));

/** Big photo tile used by cards: the professional's photo, or bold initials on a colour. */
export function ProPhoto({ p, size, radius = 18 }: { p: Pick<PC, 'displayName' | 'avatarUrl' | 'availableNow' | 'categoryName'>; size: number; radius?: number }) {
  const [failed, setFailed] = React.useState(false);
  const c = tileColor(p.categoryName || p.displayName);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      {p.avatarUrl && !failed ? (
        <Image cachePolicy="memory-disk" contentFit="cover" transition={120} source={{ uri: p.avatarUrl }} onError={() => setFailed(true)} style={{ width: size, height: size }} accessibilityLabel={p.displayName} />
      ) : (
        <T weight={800} color={c.fg} style={{ fontSize: size * 0.34, lineHeight: size * 0.42 }}>{initials(p.displayName)}</T>
      )}
      {p.availableNow ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,163,74,0.92)', paddingVertical: 3, alignItems: 'center' }}>
          <T weight={700} color="#fff" style={{ fontSize: 10, lineHeight: 13 }}>AVAILABLE</T>
        </View>
      ) : null}
    </View>
  );
}

/** A professional in a list (Swiggy-style row): big photo left, details right. */
export function ProviderCard({ p, onPress, saved, onToggleSave, compared, onToggleCompare }: { p: PC; onPress: () => void; saved?: boolean; onToggleSave?: () => void; compared?: boolean; onToggleCompare?: () => void }) {
  const amount = price(p);
  const where = [distanceLabel(p.distanceKm) || null, p.locality].filter(Boolean).join(' · ');
  return (
    <Card onPress={onPress} accessibilityLabel={`${p.displayName}, ${p.categoryName}, ${p.statusLabel}`} style={{ flexDirection: 'row', gap: 14, padding: 12 }}>
      <ProPhoto p={p} size={104} />
      <View style={{ flex: 1, gap: 4, paddingVertical: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T v="heading" numberOfLines={1} style={{ flexShrink: 1, fontSize: 17 }}>{p.displayName}</T>
            {p.badges.identity ? <BadgeCheck size={16} color={colors.brand} accessibilityLabel="ID verified" /> : null}
          </View>
          {onToggleSave ? (
            <Pressable onPress={onToggleSave} hitSlop={10} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save professional'}>
              <Heart size={20} color={saved ? colors.danger : colors.textMuted} fill={saved ? colors.danger : 'transparent'} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Rating avg={p.ratingAvg} count={p.ratingCount} />
          {p.experienceYears ? <T v="caption">· {p.experienceYears} yrs exp</T> : null}
        </View>
        <T v="caption" color={colors.textSubtle} numberOfLines={1}>{p.headline || p.categoryName}</T>
        {where ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <MapPin size={12} color={colors.textMuted} />
            <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}>{where}</T>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
          {amount ? <T v="label" weight={800} color={colors.text} style={{ flex: 1 }}>{amount}{!p.startingPriceUnit || p.startingPriceUnit === 'STARTING_AT' ? <T v="caption"> onwards</T> : null}</T> : <View style={{ flex: 1 }} />}
          {onToggleCompare ? (
            <Pressable onPress={onToggleCompare} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: !!compared }} accessibilityLabel={`Compare ${p.displayName}`}
              style={{ height: 26, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, borderColor: compared ? colors.brand : colors.border, backgroundColor: compared ? colors.tealTint : colors.white }}>
              <Check size={12} color={compared ? colors.brand : colors.textMuted} />
              <T v="micro" color={compared ? colors.teal800 : colors.textMuted}>Compare</T>
            </Pressable>
          ) : null}
        </View>
        {!p.availableNow ? <View style={{ marginTop: 2 }}><AvailabilityPill p={p} /></View> : null}
        {p.sponsored ? <T v="caption" style={{ fontSize: 11 }}>Sponsored</T> : null}
      </View>
    </Card>
  );
}

/** Vertical card for horizontal carousels (home "Top rated", "Recently viewed"). */
export function ProviderTile({ p, onPress, width = 156 }: { p: PC; onPress: () => void; width?: number }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${p.displayName}, ${p.categoryName}`} style={{ width, padding: 0, overflow: 'hidden' }}>
      <ProPhoto p={p} size={width} radius={0} />
      <View style={{ padding: 10, gap: 4 }}>
        <T v="label" weight={700} numberOfLines={1}>{p.displayName}</T>
        <T v="caption" numberOfLines={1}>{p.categoryName}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <Rating avg={p.ratingAvg} count={p.ratingCount} showCount={false} />
          <T v="caption">{distanceLabel(p.distanceKm)}</T>
        </View>
      </View>
    </Card>
  );
}
