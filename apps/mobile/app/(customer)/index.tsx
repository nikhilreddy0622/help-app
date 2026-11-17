import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ChevronDown, ChevronRight, MapPin, MessageCircle, Search } from 'lucide-react-native';
import type { ProviderCard as PC } from '@help/types';
import { BellButton, QueryBoundary, Screen, Section } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { GroupGrid } from '@/components/GroupGrid';
import { Avatar, Card, EmptyState, IdIcon, ListSkeleton, Pill, Rating, Skeleton, T } from '@/components/ui';
import { AvailabilityPill } from '@/components/ui/ProviderCard';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useLocation } from '@/lib/location';
import { useRealtime } from '@/lib/realtime';
import { useT } from '@/lib/i18n';
import { colors, shadowSm } from '@/lib/theme';
import { distanceLabel, priceLabel } from '@/lib/format';

function NowCard({ p, onPress }: { p: PC; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${p.displayName}, ${p.categoryName}, ${p.statusLabel}`} style={{ width: 220, gap: 10, padding: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Avatar name={p.displayName} url={p.avatarUrl} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T v="heading" numberOfLines={1} color={colors.text} style={{ fontSize: 15, flexShrink: 1 }}>{p.displayName}</T>
            <IdIcon badges={p.badges} />
          </View>
          <T v="caption" numberOfLines={1}>{p.categoryName}{p.experienceYears ? ` · ${p.experienceYears} yrs` : ''}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Rating avg={p.ratingAvg} count={p.ratingCount} />
        <T v="caption">{distanceLabel(p.distanceKm)}</T>
      </View>
      <AvailabilityPill p={p} />
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const loc = useLocation();
  const q = useQuery({ queryKey: ['home', loc.coords.lat, loc.coords.lng], queryFn: () => api.discovery.home(loc.coords) });
  const { signedIn } = useSession();
  const { unread } = useRealtime();
  const t = useT();
  const unreadMsgs = unread.byCategory.MESSAGES ?? 0;
  const recent = useQuery({ queryKey: ['recently-viewed'], queryFn: () => api.users.recentlyViewed(), enabled: signedIn });
  const openPro = (p: PC) => router.push(`/provider/${p.slug}`);

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, backgroundColor: colors.bg }}>
      <Logo size={30} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable onPress={() => router.push('/messages')} accessibilityRole="button" accessibilityLabel={unreadMsgs ? `Messages, ${unreadMsgs} unread` : 'Messages'} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={24} color={colors.navy} />
          {unreadMsgs > 0 ? <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: colors.bg }}><T v="micro" color="#fff" weight={700}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</T></View> : null}
        </Pressable>
        <BellButton />
      </View>
    </View>
  );
  const locRow = (
    <Pressable onPress={() => router.push('/location')} accessibilityRole="button" accessibilityLabel={`Change location, ${loc.label}`} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MapPin size={18} color={colors.teal} />
      <T v="heading" numberOfLines={1} style={{ flexShrink: 1 }}>{loc.label}</T>
      <ChevronDown size={16} color={colors.navy} />
    </Pressable>
  );

  return (
    <Screen header={header} onRefresh={async () => { await q.refetch(); }} contentStyle={{ padding: 20, gap: 24 }}>
      {locRow}
      <View style={{ gap: 6 }}>
        <T v="display">{t('Discover services near you')}</T>
        <T color={colors.textMuted}>{t('Find trusted professionals and businesses in your area.')}</T>
      </View>
      <Pressable
        onPress={() => router.push('/explore')} accessibilityRole="search" accessibilityLabel="Search for any service"
        style={[{ minHeight: 64, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }, shadowSm]}
      >
        <Search size={22} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <T v="label" weight={600}>{t('Search for any service')}</T>
          <T v="caption">Electrician, tutor, photographer{'…'}</T>
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push('/jobs')} accessibilityRole="button" accessibilityLabel="Browse jobs near you"
        style={[{ minHeight: 56, borderRadius: 16, backgroundColor: colors.tealTint, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }]}
      >
        <Briefcase size={20} color={colors.teal700} />
        <View style={{ flex: 1 }}>
          <T v="label" weight={600} color={colors.teal800}>{t('Looking for work?')}</T>
          <T v="caption" color={colors.teal800}>{t('Browse jobs posted nearby')}</T>
        </View>
        <ChevronRight size={20} color={colors.teal700} />
      </Pressable>
      <GroupGrid />

      <QueryBoundary q={q} skeleton={<HomeSkeleton />}>
        {(feed) => (
          <>
            <Section title={t('Available now nearby')} action="See all" onAction={() => router.push({ pathname: '/explore', params: { availableNow: '1' } })}>
              {feed.availableNow.length === 0 ? (
                <Card><T color={colors.textMuted}>No one is available right now. Browse all professionals nearby.</T></Card>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                  {feed.availableNow.map((p) => <NowCard key={p.id} p={p} onPress={() => openPro(p)} />)}
                </ScrollView>
              )}
            </Section>

            {recent.data?.length ? (
              <Section title="Recently viewed">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                  {recent.data.slice(0, 8).map((p) => <NowCard key={p.id} p={p} onPress={() => openPro(p)} />)}
                </ScrollView>
              </Section>
            ) : null}

            <Section title={`Top rated${loc.place ? ` in ${loc.label.split(',')[0]}` : ' nearby'}`}>
              {feed.topRated.length === 0 ? (
                <EmptyState title="No professionals here yet" body="Try another area or widen your search." actionLabel="Change location" onAction={() => router.push('/location')} />
              ) : (
                <View style={{ gap: 4 }}>
                  {feed.topRated.map((p) => (
                    <Pressable key={p.id} onPress={() => openPro(p)} accessibilityRole="button" accessibilityLabel={p.displayName} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 60, paddingVertical: 6 }}>
                      <Avatar name={p.displayName} url={p.avatarUrl} />
                      <View style={{ flex: 1 }}>
                        <T v="heading" color={colors.text} style={{ fontSize: 15 }} numberOfLines={1}>{p.displayName}</T>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}>{p.categoryName}</T>
                          <Rating avg={p.ratingAvg} count={p.ratingCount} />
                          <T v="caption">{distanceLabel(p.distanceKm)}</T>
                        </View>
                      </View>
                      {p.startingPricePaise != null ? <T v="caption">from {priceLabel(p.startingPricePaise, null)}</T> : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </Section>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => <View key={i} style={{ width: '25%', alignItems: 'center', gap: 8 }}><Skeleton w={56} h={56} r={16} /><Skeleton w={48} h={10} /></View>)}
      </View>
      <ListSkeleton count={2} />
    </View>
  );
}
