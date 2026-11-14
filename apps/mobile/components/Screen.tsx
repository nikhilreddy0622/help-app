import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { colors } from '@/lib/theme';
import { useRealtime } from '@/lib/realtime';
import { T } from './ui/Text';
import { ErrorState } from './ui/ErrorState';

export function IconButton({ icon, label, onPress, bordered, badge }: { icon: React.ReactNode; label: string; onPress: () => void; bordered?: boolean; badge?: number }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: bordered ? 1 : 0, borderColor: colors.border, backgroundColor: bordered ? colors.white : 'transparent' }}
    >
      {icon}
      {badge ? <CountDot n={badge} /> : null}
    </Pressable>
  );
}

export function CountDot({ n }: { n: number }) {
  return (
    <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bg }}>
      <T v="micro" color="#fff" style={{ fontSize: 10, lineHeight: 12 }}>{n > 99 ? '99+' : n}</T>
    </View>
  );
}

export function BellButton() {
  const router = useRouter();
  const { unread } = useRealtime();
  return (
    <IconButton
      bordered badge={unread.count}
      label={unread.count ? `Notifications, ${unread.count} unread` : 'Notifications'}
      icon={<Bell size={20} color={colors.navy} />}
      onPress={() => router.push('/notifications')}
    />
  );
}

export function Header({ title, subtitle, back = true, right, onBack }: { title?: string; subtitle?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {back ? <IconButton label="Back" icon={<ChevronLeft size={24} color={colors.navy} />} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} /> : <View style={{ width: 8 }} />}
      <View style={{ flex: 1, paddingVertical: 8 }}>
        {title ? <T v="heading" numberOfLines={1}>{title}</T> : null}
        {subtitle ? <T v="caption" numberOfLines={1}>{subtitle}</T> : null}
      </View>
      {right}
    </View>
  );
}

interface ScreenProps {
  title?: string; subtitle?: string; back?: boolean; right?: React.ReactNode; header?: React.ReactNode;
  scroll?: boolean; onRefresh?: () => Promise<unknown> | void; footer?: React.ReactNode; children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>; keyboard?: boolean; bg?: string; noHeader?: boolean; onBack?: () => void;
}
/** Safe-area scaffold: optional header, scrolling body with pull-to-refresh, sticky footer, keyboard avoidance, tablet max width. */
export function Screen({ title, subtitle, back = true, right, header, scroll = true, onRefresh, footer, children, contentStyle, keyboard, bg = colors.bg, noHeader, onBack }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal700} colors={[colors.teal700]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : keyboard ? 'height' : undefined}>
        {header ?? (noHeader ? null : <Header title={title} subtitle={subtitle} back={back} right={right} onBack={onBack} />)}
        {body}
        {footer ? (
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ padding: 16, paddingBottom: 12, gap: 8, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{footer}</View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Renders skeleton / error / children for a query. Empty handling is left to the caller. */
export function QueryBoundary<T2>({ q, skeleton, children }: { q: UseQueryResult<T2>; skeleton: React.ReactNode; children: (data: T2) => React.ReactNode }) {
  if (q.isPending) return <>{skeleton}</>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <>{children(q.data as T2)}</>;
}

export const Section = ({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) => (
  <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <T v="heading">{title}</T>
      {action ? <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}><T v="label" weight={600} color={colors.teal700}>{action}</T></Pressable> : null}
    </View>
    {children}
  </View>
);

export function Row({ icon, label, value, onPress, danger, right }: { icon?: React.ReactNode; label: string; value?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceMuted : colors.white })}
    >
      {icon}
      <T v="body" style={{ flex: 1 }} color={danger ? colors.danger : colors.text}>{label}</T>
      {value ? <T v="caption" numberOfLines={1} style={{ maxWidth: '45%' }}>{value}</T> : null}
      {right}
    </Pressable>
  );
}

export function Group({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {items.map((c, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: 16 }} /> : null}
          {c}
        </View>
      ))}
    </View>
  );
}
