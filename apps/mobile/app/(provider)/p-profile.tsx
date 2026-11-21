import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Award, CalendarClock, Eye, IndianRupee, ImagePlus, MapPin, ShieldCheck, UserRound, Briefcase, ChevronRight } from 'lucide-react-native';
import { Group, QueryBoundary, Row } from '@/components/Screen';
import { Avatar, Button, Card, ListSkeleton, Pill, T } from '@/components/ui';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

const chev = <ChevronRight size={18} color={colors.textMuted} />;
const ic = (I: typeof Award) => <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}><I size={18} color={colors.text} /></View>;
const SECTIONS: [string, string, typeof Award][] = [
  ['Name, photo and profession', 'you', UserRound], ['Intro, skills and languages', 'about', Briefcase], ['Location and radius', 'where', MapPin],
  ['Services and prices', 'services', IndianRupee], ['Working hours', 'hours', CalendarClock], ['Work photos', 'portfolio', ImagePlus], ['Verification', 'verification', ShieldCheck],
];

export default function ProviderProfileEditor() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['my-provider'], queryFn: () => api.providers.mine() });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <T v="display" style={{ fontSize: 26, lineHeight: 32, paddingTop: 4 }}>Your profile</T>
        <QueryBoundary q={q} skeleton={<ListSkeleton count={2} />}>
          {(p) => !p ? <Button title="Set up your profile" onPress={() => router.push('/onboarding')} /> : (
            <>
              <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Avatar name={p.displayName} url={p.avatarUrl} size={56} />
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="heading" numberOfLines={1}>{p.displayName}</T>
                  <T v="caption" numberOfLines={1}>{p.headline}</T>
                  <Pill label={p.isDiscoverable ? 'Live' : p.status === 'DRAFT' ? 'Draft' : 'Hidden'} bg={p.isDiscoverable ? colors.successBg : colors.surfaceMuted} fg={p.isDiscoverable ? colors.successFg : '#334155'} />
                </View>
              </Card>
              <Button kind="secondary" title="Preview public profile" icon={<Eye size={18} color={colors.navy} />} onPress={() => router.push(`/provider/${p.slug}`)} />
              <Group>
                {SECTIONS.map(([l, s, I]) => <Row key={l} icon={ic(I)} label={l} right={chev} onPress={() => router.push({ pathname: '/onboarding', params: { section: s, edit: '1' } })} />)}
              </Group>
            </>
          )}
        </QueryBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
