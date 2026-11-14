import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, LifeBuoy, Search, Ticket } from 'lucide-react-native';
import { Group, Row, Screen } from '@/components/Screen';
import { Button, Card, EmptyState, T } from '@/components/ui';
import { FAQ } from '@/lib/faq';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Help() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const tickets = useQuery({ queryKey: ['support'], queryFn: () => api.support.list(), enabled: signedIn });
  const unread = tickets.data?.items.filter((t) => t.unreadForUser).length ?? 0;

  const sections = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return FAQ;
    return FAQ.map((s) => ({ ...s, items: s.items.filter((i) => (i.q + ' ' + i.a).toLowerCase().includes(t)) })).filter((s) => s.items.length);
  }, [term]);

  return (
    <Screen title="Help centre" contentStyle={{ padding: 16, gap: 16 }}>
      <View style={{ height: 48, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
        <Search size={18} color={colors.navy} />
        <TextInput value={term} onChangeText={setTerm} placeholder="Search help articles" placeholderTextColor={colors.textMuted} accessibilityLabel="Search help articles" style={{ flex: 1, height: 48, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text }} />
      </View>
      {sections.length === 0 ? (
        <EmptyState icon={<LifeBuoy size={28} color={colors.textMuted} />} title="No matching articles" body="Try different words, or ask our team directly." actionLabel="Contact support" onAction={() => router.push('/support/new')} />
      ) : sections.map((s) => (
        <View key={s.title} style={{ gap: 8 }}>
          <T v="overline">{s.title}</T>
          <Card padded={false}>
            {s.items.map((i, idx) => {
              const key = `${s.title}-${i.q}`;
              const on = open === key || !!term.trim();
              return (
                <View key={key} style={{ borderTopWidth: idx ? 1 : 0, borderTopColor: colors.divider }}>
                  <Pressable onPress={() => setOpen(on && !term ? null : key)} accessibilityRole="button" accessibilityState={{ expanded: on }} style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                    <T v="label" style={{ flex: 1 }}>{i.q}</T>
                    {on ? <ChevronDown size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
                  </Pressable>
                  {on ? <T color={colors.textSubtle} style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{i.a}</T> : null}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
      <View style={{ gap: 8 }}>
        <T v="overline">Still need help?</T>
        <Group>
          <Row icon={<Ticket size={20} color={colors.navy} />} label="My support tickets" value={unread ? `${unread} new` : undefined} right={<ChevronRight size={18} color={colors.textMuted} />} onPress={() => (signedIn ? router.push('/support') : router.push('/auth/welcome'))} />
        </Group>
        <Button title="Contact support" onPress={() => (signedIn ? router.push('/support/new') : router.push('/auth/welcome'))} />
      </View>
    </Screen>
  );
}
