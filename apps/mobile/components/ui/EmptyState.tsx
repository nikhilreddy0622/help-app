import React from 'react';
import { View } from 'react-native';
import { colors } from '@/lib/theme';
import { Button } from './Button';
import { T } from './Text';

export function EmptyState({ icon, title, body, actionLabel, onAction }: { icon?: React.ReactNode; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 }}>
      {icon ? (
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{icon}</View>
      ) : null}
      <T v="title" align="center" style={{ fontSize: 18 }}>{title}</T>
      {body ? <T v="body" color={colors.textMuted} align="center">{body}</T> : null}
      {actionLabel && onAction ? <View style={{ marginTop: 16 }}><Button title={actionLabel} onPress={onAction} /></View> : null}
    </View>
  );
}
