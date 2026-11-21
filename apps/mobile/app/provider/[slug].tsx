import React, { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Alert, Image, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Heart, MapPin, MessageCircle, MoreVertical, Share2, Star } from 'lucide-react-native';
import type { ProviderPublicProfile, ReviewDto, ServiceOffering } from '@help/types';
import { Gallery } from '@/components/Gallery';
import Map from '@/components/Map';
import { PresencePill, StatusNote } from '@/components/ui/StatusPill';
import { Button, BadgeRow, ProPhoto, Card, Chip, EmptyState, ErrorState, Input, Rating, Sheet, Skeleton, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSaved } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, shadowMd, shadowSm, tileColor } from '@/lib/theme';
import { WEEKDAYS, formatDate, formatINR, minuteLabel } from '@/lib/format';

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.helpbharath.com';
type Tab = 'Services' | 'About' | 'Portfolio' | 'Reviews';

function priceNode(s: ServiceOffering) {
  const muted = { fontFamily: 'Inter_400Regular', color: colors.textMuted, fontSize: 13 } as const;
  if (s.priceUnit === 'STARTING_AT') return <T weight={700}><T style={muted}>from </T>{formatINR(s.pricePaise)}</T>;
  const suffix: Record<string, string> = { HOURLY: '/ hour', PER_VISIT: '/ visit', FIXED: 'fixed', PER_DAY: '/ day', PER_SESSION: '/ session' };
  return <T weight={700}>{formatINR(s.pricePaise)} <T style={muted}>{suffix[s.priceUnit] ?? ''}</T></T>;
}

export default function ProviderProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { signedIn, requireAuth } = useSession();
  const saved = useSaved();
  const [tab, setTab] = useState<Tab>('Services');
  const [gallery, setGallery] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const q = useQuery({ queryKey: ['provider', slug], queryFn: () => api.providers.bySlug(slug!) });
  const elig = useQuery({ queryKey: ['eligibility', q.data && !('redirectTo' in q.data) ? q.data.id : ''], queryFn: () => api.reviews.eligibility((q.data as ProviderPublicProfile).id), enabled: signedIn && !!q.data && !('redirectTo' in q.data) });

  useEffect(() => { if (q.data && 'redirectTo' in q.data) router.replace(`/provider/${q.data.redirectTo}`); }, [q.data, router]);

  const p = q.data && !('redirectTo' in q.data) ? q.data : null;

  if (q.isPending || (q.data && !p)) return <Shell><View style={{ padding: 20, gap: 16 }}><Skeleton h={88} w={88} r={44} /><Skeleton w="50%" h={24} /><Skeleton w="80%" /><Skeleton h={72} r={14} /></View></Shell>;
  if (q.isError || !p) return <Shell><ErrorState error={q.error} onRetry={() => q.refetch()} /></Shell>;

  const startChat = () => { if (requireAuth()) router.push({ pathname: '/chat/[id]', params: { id: 'new', providerId: p.id, name: p.displayName, slug: p.slug } }); };
  const showPhone = async () => {
    if (!requireAuth()) return;
    setPhoneBusy(true);
    try { const r = await api.providers.revealPhone(p.id); setPhone(r.phone); qc.invalidateQueries({ queryKey: ['eligibility'] }); } catch (e) { Alert.alert('Phone number', errorMessage(e)); } finally { setPhoneBusy(false); }
  };
  const share = () => Share.share({ message: `${p.displayName}, ${p.categoryName} on help: ${WEB_BASE}/professionals/${p.slug}` }).catch(() => undefined);
  const isSaved = saved.isSaved(p.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 170, backgroundColor: tileColor(p.categoryName).bg }}>
          {p.coverUrl ? <Image source={{ uri: p.coverUrl }} style={{ ...StyleAbs, opacity: 0.55 }} /> : null}
          <SafeAreaView edges={['top']} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 4 }}>
            <RoundBtn label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}><ChevronLeft size={22} color={colors.text} /></RoundBtn>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundBtn label="Share profile" onPress={share}><Share2 size={20} color={colors.text} /></RoundBtn>
              <RoundBtn label={isSaved ? 'Remove from saved' : 'Save professional'} onPress={() => saved.toggle(p.id)}><Heart size={20} color={isSaved ? colors.danger : colors.text} fill={isSaved ? colors.danger : 'transparent'} /></RoundBtn>
              <RoundBtn label="More options" onPress={() => (signedIn ? setMenu(true) : requireAuth())}><MoreVertical size={20} color={colors.text} /></RoundBtn>
            </View>
          </SafeAreaView>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <View style={{ marginTop: -56, width: 112, height: 112, borderRadius: 30, borderWidth: 4, borderColor: colors.white, overflow: 'hidden', backgroundColor: colors.white }}>
            <ProPhoto p={p} size={104} radius={26} />
          </View>
          <View style={{ gap: 4, marginTop: -6 }}>
            <T v="display" style={{ fontSize: 24, lineHeight: 30 }}>{p.displayName}</T>
            <T>{p.headline || p.categoryName}{p.experienceYears ? ` · ${p.experienceYears} years` : ''}</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
              <T v="caption" style={{ flex: 1 }}>{[p.locality, p.serviceRadiusKm ? `serves within ${p.serviceRadiusKm} km` : '', p.languages.join(', ')].filter(Boolean).join(' · ')}</T>
            </View>
          </View>
          <BadgeRow badges={p.badges} qualificationLabel={p.qualifications[0]} />

          <View style={[{ flexDirection: 'row', backgroundColor: colors.white, borderRadius: 18, paddingVertical: 14 }, shadowSm]}>
            <Stat onPress={() => setTab('Reviews')} top={p.ratingCount ? <Rating avg={p.ratingAvg} count={p.ratingCount} showCount={false} /> : <T v="heading">New</T>} sub={`${p.ratingCount} review${p.ratingCount === 1 ? '' : 's'}`} />
            <Stat top={<T v="heading">{new Date(p.memberSince).getFullYear()}</T>} sub="member since" bordered />
            <Stat top={<T v="heading">{p.responseMinutes != null ? `~${p.responseMinutes} min` : '—'}</T>} sub="reply time" />
          </View>

          <LocationCard p={p} />

          <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 4 }} accessibilityRole="tablist">
            {(['Services', 'About', 'Portfolio', 'Reviews'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={{ flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.white : 'transparent' }}>
                <T v="label" weight={tab === t ? 700 : 600} color={tab === t ? colors.text : colors.textMuted} style={{ fontSize: 13 }}>{t}</T>
              </Pressable>
            ))}
          </View>

          {tab === 'Services' ? (
            p.services.length === 0 ? <T color={colors.textMuted}>Prices are shared on request.</T> : (
              <View>{p.services.map((s) => (
                <View key={s.id} style={{ minHeight: 52, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                  <View style={{ flex: 1 }}><T>{s.title}</T>{s.negotiable ? <T v="caption">Negotiable</T> : null}</View>
                  {priceNode(s)}
                </View>
              ))}</View>
            )
          ) : null}
          {tab === 'About' ? <About p={p} /> : null}
          {tab === 'Portfolio' ? (
            p.portfolio.length === 0 ? <T color={colors.textMuted}>No portfolio items yet.</T> : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {p.portfolio.filter((i) => i.kind === 'IMAGE' || i.kind === 'CERTIFICATE').map((it, i) => (
                  <Pressable key={it.id} onPress={() => setGallery(i)} accessibilityRole="imagebutton" accessibilityLabel={it.title ?? 'Portfolio photo'} style={{ width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
                    <Image source={{ uri: it.url }} style={{ width: '100%', height: '100%' }} />
                  </Pressable>
                ))}
              </View>
            )
          ) : null}
          {tab === 'Reviews' ? (
            <>
              <ReviewPrompt canReview={!!elig.data?.canReview} reason={elig.data?.reason} signedIn={signedIn} onWrite={() => router.push(`/review/${p.id}`)} onSignIn={requireAuth} />
              <Reviews p={p} />
            </>
          ) : null}

          <View style={{ gap: 6 }}>
            <PresencePill status={p.status} label={p.statusLabel} />
            <StatusNote message={p.statusMessage} updatedAt={p.statusUpdatedAt} />
          </View>
        </View>
      </ScrollView>

      <View style={[{ padding: 16, paddingBottom: 12, gap: 8, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, shadowMd]}>
        {p.status !== 'AVAILABLE' ? (
          <T v="caption" color={colors.textSubtle} align="center">
            {p.statusLabel}. You can still message; they will reply when back.
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <Button size="lg" title="Chat" icon={<MessageCircle size={18} color="#fff" />} style={{ flex: 1 }} onPress={startChat} />
          {p.phoneAvailable ? <Button kind="accent" size="lg" title="Show number" loading={phoneBusy} style={{ flex: 1 }} onPress={showPhone} /> : null}
        </View>
      </View>

      <Sheet visible={!!phone} onClose={() => setPhone(null)} title={`${p.displayName}'s number`}>
        <T style={{ fontSize: 28, lineHeight: 34 }} weight={700} color={colors.navy} selectable>{phone}</T>
        <Button title="Copy" icon={<Copy size={18} color="#fff" />} onPress={async () => { await Clipboard.setStringAsync(phone ?? ''); Alert.alert('Copied', 'Phone number copied to clipboard.'); }} />
        <T v="caption">Please be respectful of working hours. Prefer chat for first contact.</T>
      </Sheet>
      <Gallery urls={p.portfolio.filter((i) => i.kind === 'IMAGE' || i.kind === 'CERTIFICATE').map((i) => i.url)} index={gallery} onClose={() => setGallery(null)} />
      <MenuSheet visible={menu} onClose={() => setMenu(false)} p={p} />
    </SafeAreaView>
  );
}

const StyleAbs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={24} color={colors.navy} /></Pressable>
      {children}
    </SafeAreaView>
  );
}

function RoundBtn({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable>;
}

function Stat({ top, sub, bordered, onPress }: { top: React.ReactNode; sub: string; bordered?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: bordered ? 1 : 0, borderRightWidth: bordered ? 1 : 0, borderColor: colors.border }}>
      {top}
      <T v="caption" style={{ fontSize: 12 }}>{sub}</T>
    </Pressable>
  );
}

function LocationCard({ p }: { p: ProviderPublicProfile }) {
  const line = [p.locality, p.distanceKm != null ? `${p.distanceKm} km from you` : null].filter(Boolean).join(' · ');
  return (
    <View style={[{ backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden' }, shadowSm]}>
      {p.area ? <Map style={{ height: 140 }} center={p.area} zoom={13} radiusKm={1} hideCenter interactive={false} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}><MapPin size={18} color={colors.teal700} /></View>
        <View style={{ flex: 1 }}>
          <T v="label" weight={600} color={colors.text}>{line || 'Location not added yet'}</T>
          <T v="caption">{p.serviceMode === 'REMOTE' ? 'Works online' : `Visits within ${p.serviceRadiusKm} km`}{p.areasServed.length ? ` · ${p.areasServed.slice(0, 3).join(', ')}` : ''}</T>
        </View>
      </View>
      <T v="caption" style={{ fontSize: 11, paddingHorizontal: 12, paddingBottom: 10, marginTop: -4 }}>Approximate area shown. Agree the exact address with them in chat.</T>
    </View>
  );
}

function ReviewPrompt({ canReview, reason, signedIn, onWrite, onSignIn }: { canReview: boolean; reason?: string; signedIn: boolean; onWrite: () => void; onSignIn: () => void }) {
  if (canReview) return <Button title="Rate and review" icon={<Star size={18} color="#fff" />} onPress={onWrite} />;
  const text = !signedIn ? 'Sign in to rate this professional.' : reason === 'ALREADY_REVIEWED' ? 'Thanks, you have already reviewed this professional.' : reason === 'SELF' ? 'This is your profile.' : 'Chat with them or view their number, then you can rate them here.';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12 }}>
      <Star size={18} color={colors.textMuted} />
      <T v="caption" style={{ flex: 1 }}>{text}</T>
      {!signedIn ? <Button kind="ghost" size="sm" title="Sign in" onPress={onSignIn} /> : null}
    </View>
  );
}

function About({ p }: { p: ProviderPublicProfile }) {
  const days = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, rules: p.workingHours.rules.filter((r) => r.weekday === d) }));
  return (
    <View style={{ gap: 20 }}>
      {p.bio ? <T>{p.bio}</T> : <T color={colors.textMuted}>This professional has not added a bio yet.</T>}
      {p.skills.length ? <Block title="Skills"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{p.skills.map((s) => <Chip key={s} label={s} />)}</View></Block> : null}
      {p.qualifications.length ? <Block title="Qualifications">{p.qualifications.map((s) => <T key={s}>{s}</T>)}</Block> : null}
      <Block title="Service area">
        <T>{p.serviceMode === 'REMOTE' ? 'Online only' : p.serviceMode === 'BOTH' ? 'On-site and online' : 'On-site visits'} {'·'} within {p.serviceRadiusKm} km</T>
        {p.areasServed.length ? <T v="caption">{p.areasServed.join(', ')}</T> : null}
      </Block>
      {p.workingHours.rules.length ? <Block title="Working hours">
        {days.map(({ d, rules }) => (
          <View key={d} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T color={colors.textSubtle}>{WEEKDAYS[d]}</T>
            <T>{rules.length ? rules.map((r) => `${minuteLabel(r.startMinute)}–${minuteLabel(r.endMinute)}`).join(', ') : 'Closed'}</T>
          </View>
        ))}
      </Block> : null}
      <Block title="Member since"><T>{new Date(p.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</T></Block>
    </View>
  );
}
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (<View style={{ gap: 8 }}><T v="overline">{title}</T>{children}</View>);

function Reviews({ p }: { p: ProviderPublicProfile }) {
  const q = useInfiniteQuery({
    queryKey: ['reviews', p.id], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.providers.reviews(p.id, { cursor: pageParam }),
    getNextPageParam: (l) => l.meta.nextCursor ?? undefined,
  });
  const list: ReviewDto[] = q.data ? q.data.pages.flatMap((x) => x.items) : p.recentReviews;
  if (q.isPending && !p.recentReviews.length) return <Skeleton h={80} r={12} />;
  if (!list.length) return <EmptyState title="No reviews yet" body="Reviews come only from customers who contacted this professional." />;
  return (
    <View style={{ gap: 12 }}>
      {list.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="label" weight={600}>{r.authorName}</T>
            <T v="caption">{formatDate(r.createdAt)}</T>
          </View>
          <Rating avg={r.overall} count={1} showCount={false} />
          {r.comment ? <T>{r.comment}</T> : null}
          {r.reply ? <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12, gap: 4 }}><T v="micro">Reply from {p.displayName.split(' ')[0]}</T><T v="caption" color={colors.textSubtle}>{r.reply}</T></View> : null}
          <T v="caption" style={{ fontSize: 12 }}>Contacted via help</T>
        </Card>
      ))}
      {q.hasNextPage ? <Button kind="secondary" title="Load more reviews" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} /> : null}
    </View>
  );
}

const REASONS = [['FAKE_PROFILE', 'Fake profile'], ['FRAUD', 'Fraud'], ['ABUSE', 'Abusive behaviour'], ['SAFETY', 'Safety concern'], ['SPAM', 'Spam'], ['OTHER', 'Other']] as const;
function MenuSheet({ visible, onClose, p }: { visible: boolean; onClose: () => void; p: ProviderPublicProfile }) {
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>('OTHER');
  const [details, setDetails] = useState('');
  useEffect(() => { if (visible) setMode('menu'); }, [visible]);
  const report = useMutation({
    mutationFn: () => api.reports.create({ targetType: 'PROVIDER', targetId: p.id, reason, details: details || undefined }),
    onSuccess: () => { onClose(); Alert.alert('Report sent', 'Thank you. Our team will review it.'); },
    onError: (e) => Alert.alert('Could not send report', errorMessage(e)),
  });
  const block = () => Alert.alert(`Block ${p.displayName}?`, 'You will no longer see or hear from this professional.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: () => api.blockProvider(p.id).then(() => { onClose(); Alert.alert('Blocked'); }).catch((e) => Alert.alert('Could not block', errorMessage(e))) },
  ]);
  return (
    <Sheet visible={visible} onClose={onClose} title={mode === 'menu' ? p.displayName : 'Report this profile'}>
      {mode === 'menu' ? (
        <View style={{ gap: 12 }}>
          <Button kind="secondary" title="Report profile" onPress={() => setMode('report')} />
          <Button kind="danger" title="Block professional" onPress={block} />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{REASONS.map(([k, l]) => <Chip key={k} label={l} selected={reason === k} onPress={() => setReason(k)} />)}</View>
          <Input label="Details (optional)" multiline value={details} onChangeText={setDetails} />
          <Button title="Send report" loading={report.isPending} onPress={() => report.mutate()} />
        </View>
      )}
    </Sheet>
  );
}
