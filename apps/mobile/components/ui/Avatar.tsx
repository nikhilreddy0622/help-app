import React from 'react';
import { Image, View } from 'react-native';
import { avatarPalette } from '@/lib/theme';
import { initials } from '@/lib/format';
import { T } from './Text';

export function Avatar({ name, url, size = 44 }: { name?: string | null; url?: string | null; size?: number }) {
  const idx = (name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarPalette.length;
  const p = avatarPalette[idx] ?? avatarPalette[0]!;
  if (url) {
    return <Image source={{ uri: url }} accessibilityLabel={name ?? 'Avatar'} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.bg }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
      <T weight={600} color={p.fg} style={{ fontSize: Math.round(size * 0.34) }}>{initials(name)}</T>
    </View>
  );
}
