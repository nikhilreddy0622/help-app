import React, { useCallback } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, BookOpen, Car, ChevronDown, Droplets, Hammer, MapPin, MessageCircle, Scissors, Search, ShieldCheck, Snowflake, Sparkles, UserPlus, Wallet, Zap, type LucideIcon } from 'lucide-react-native';
import type { Category, ProviderCard as PC } from '@help/types';
import { QueryBoundary, Section } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { GroupGrid } from '@/components/GroupGrid';
import { EmptyState, Press, ProviderCard, ProviderTile, Skeleton, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useCategories, useSaved } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useLocation } from '@/lib/location';
import { useRealtime } from '@/lib/realtime';
import { colors, tileColor } from '@/lib/theme';

// Popular services shown as quick shortcuts (catalog service names).
const POPULAR = ['Electrician', 'Plumber', 'AC repair and servicing', 'House cleaning', 'Home tutor', 'Carpenter', 'Beautician', 'Personal driver'];
const POPULAR_ICON: Record<string, LucideIcon> = { Electrician: Zap, Plumber: Droplets, 'AC repair and servicing': Snowflake, 'House cleaning': Sparkles, 'Home tutor': BookOpen, Carpenter: Hammer, Beautician: Scissors, 'Personal driver': Car };
const SHORT: Record<string, string> = { 'AC repair and servicing': 'AC repair', 'House cleaning': 'Cleaning', 'Personal driver': 'Driver', 'Home tutor': 'Tutor' };

function HeaderIcon({ icon, label, badge, onPress }: { icon: React.ReactNode; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' })}>
      {icon}
      {badge ? <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><T weight={800} color={colors.accentInk} style={{ fontSize: 10, lineHeight: 12 }}>{badge > 9 ? '9+' : badge}</T></View> : null}
    </Pressable>
  );
}

const BANNERS = [
  { key: 'free', title: 'Free for customers', body: 'Chat or call pros directly. No commission, no middleman.', bg: colors.navy, fg: '#fff', sub: '#C9D3E6', icon: Wallet, to: '/explore' },
  { key: 'verified', title: 'See who you are hiring', body: 'Real reviews, ID and qualification badges on every profile.', bg: '#FFF1D6', fg: '#4A3200', sub: '#7A5A14', icon: ShieldCheck, to: '/explore' },
  { key: 'pro', title: 'Are you a professional?', body: 'Get found by customers near you. Set up in 4 steps.', bg: '#E3F4EF', fg: '#063F38', sub: '#2E6B62', icon: UserPlus, to: '/register' },
] as const;

function Banners() {
  const router = useRouter();
  const w = Math.min(Dimensions.get('window').width - 56, 360);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={w + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
      {BANNERS.map((b) => (
        <Press key={b.key} onPress={() => router.push(b.to as never)} accessibilityRole="button" accessibilityLabel={b.title} scaleTo={0.98}
          style={{ width: w, minHeight: 124, borderRadius: 22, backgroundColor: b.bg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <T v="title" color={b.fg} style={{ fontSize: 18, lineHeight: 23 }}>{b.title}</T>
            <T v="caption" color={b.sub} style={{ fontSize: 13 }}>{b.body}</T>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: b.key === 'free' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <b.icon size={30} color={b.key === 'free' ? colors.accent : b.fg} strokeWidth={2} />
          </View>
        </Press>
      ))}
    </ScrollView>
  );
}

function Popular({ cats }: { cats: Category[] }) {
  const router = useRouter();
  const list = POPULAR.map((n) => cats.find((c) => c.parentId && c.name === n)).filter((c): c is Category => !!c);
  if (!list.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
      {list.map((c) => {
        const t = tileColor(c.slug);
        return (
          <Press key={c.id} onPress={() => router.push({ pathname: '/results', params: { categoryId: c.id, categoryName: c.name } })} accessibilityRole="button" accessibilityLabel={c.name} scaleTo={0.93} style={{ alignItems: 'center', gap: 6, width: 68 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
              {React.createElement(POPULAR_ICON[c.name] ?? Sparkles, { size: 28, color: t.fg, strokeWidth: 2 })}
            </View>
            <T align="center" numberOfLines={1} weight={600} style={{ fontSize: 12 }}>{SHORT[c.name] ?? c.name}</T>
          </Press>
        );
      })}
    </ScrollView>
  );
}

export default function Home() {
  const router = useRouter();
  const loc = useLocation();
  const cats = useCategories();
  const saved = useSaved();
  const q = useQuery({ queryKey: ['home', loc.coords.lat, loc.coords.lng], queryFn: () => api.discovery.home(loc.coords) });
  const { signedIn } = useSession();
  const { unread } = useRealtime();
  const unreadMsgs = unread.byCategory.MESSAGES ?? 0;
  const recent = useQuery({ queryKey: ['recently-viewed'], queryFn: () => api.users.recentlyViewed(), enabled: signedIn });
  const openPro = (p: PC) => router.push(`/provider/${p.slug}`);
  const area = loc.label.split(',')[0];
  useFocusEffect(useCallback(() => { setStatusBarStyle('light'); return () => setStatusBarStyle('dark'); }, []));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.brand }}>
      <ScrollView style={{ backgroundColor: colors.bg }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }} stickyHeaderIndices={[1]}>
        <View style={{ backgroundColor: colors.brand }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><Logo size={24} light /></View>
              <HeaderIcon label={unreadMsgs ? `Messages, ${unreadMsgs} unread` : 'Messages'} badge={unreadMsgs} icon={<MessageCircle size={21} color="#fff" />} onPress={() => router.push('/messages')} />
              <HeaderIcon label={unread.count ? `Notifications, ${unread.count} unread` : 'Notifications'} badge={unread.count} icon={<Bell size={21} color="#fff" />} onPress={() => router.push('/notifications')} />
            </View>
            <Pressable onPress={() => router.push('/location')} accessibilityRole="button" accessibilityLabel={`Change location, ${loc.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 30 }}>
              <MapPin size={16} color={colors.accent} fill={colors.accent} />
              <T weight={800} color="#fff" numberOfLines={1} style={{ fontSize: 15, maxWidth: 230 }}>{area}</T>
              <ChevronDown size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
        <View style={{ backgroundColor: colors.brand, paddingHorizontal: 16, paddingBottom: 14, marginTop: -1, paddingTop: 1 }}>
          <Press onPress={() => router.push('/explore')} accessibilityRole="search" accessibilityLabel="Search for a service or professional" scaleTo={0.99}
            style={{ height: 50, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
            <Search size={20} color={colors.brand} strokeWidth={2.5} />
            <T color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }} weight={500}>Search “electrician”, “tutor”, “cook”</T>
          </Press>
        </View>

        <View style={{ backgroundColor: colors.brand, height: 20 }}>
          <View style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />
        </View>

        <View style={{ gap: 26 }}>
          <Banners />

          {cats.data ? (
            <View style={{ gap: 12 }}>
              <T v="title" style={{ fontSize: 19, paddingHorizontal: 16 }}>What do you need today?</T>
              <Popular cats={cats.data} />
            </View>
          ) : null}

          <View style={{ paddingHorizontal: 16 }}>
            <Section title="All categories">
              <GroupGrid />
            </Section>
          </View>

          {recent.data?.length ? (
            <View style={{ gap: 12 }}>
              <T v="title" style={{ fontSize: 19, paddingHorizontal: 16 }}>Recently viewed</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
                {recent.data.slice(0, 8).map((p) => <ProviderTile key={p.id} p={p} onPress={() => openPro(p)} />)}
              </ScrollView>
            </View>
          ) : null}

          <QueryBoundary q={q} skeleton={<View style={{ paddingHorizontal: 16, gap: 12 }}><Skeleton w={180} h={20} /><Skeleton h={128} r={20} /><Skeleton h={128} r={20} /></View>}>
            {(feed) => feed.topRated.length === 0 ? (
              <EmptyState title="No professionals here yet" body="Try another area, or check back soon." actionLabel="Change location" onAction={() => router.push('/location')} />
            ) : (
              <View style={{ gap: 12, paddingHorizontal: 16 }}>
                <Section title={loc.place ? `Top rated in ${area}` : 'Top rated near you'} action="See all" onAction={() => router.push({ pathname: '/results', params: { sort: 'rating' } })}>
                  <View style={{ gap: 12 }}>
                    {feed.topRated.slice(0, 6).map((p) => <ProviderCard key={p.id} p={p} onPress={() => openPro(p)} saved={saved.isSaved(p.id)} onToggleSave={() => saved.toggle(p.id)} />)}
                  </View>
                </Section>
              </View>
            )}
          </QueryBoundary>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
