import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { avatarPalette, colors } from '@/lib/theme';
import { initials } from '@/lib/format';
import { T } from './Text';

/** Photo or initials. `rounded` gives a soft square (used for professionals), default is a circle. `live` adds the green availability dot. */
export function Avatar({ name, url, size = 44, rounded, live }: { name?: string | null; url?: string | null; size?: number; rounded?: boolean; live?: boolean }) {
  const idx = (name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarPalette.length;
  const p = avatarPalette[idx] ?? avatarPalette[0]!;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  const r = rounded ? Math.round(size * 0.28) : size / 2;
  const dot = Math.max(10, Math.round(size * 0.24));
  return (
    <View style={{ width: size, height: size }}>
      {url && !failed ? (
        <Image source={{ uri: url }} accessibilityLabel={name ?? 'Avatar'} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: r, backgroundColor: p.bg }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: r, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
          <T weight={600} color={p.fg} style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.46) }}>{initials(name)}</T>
        </View>
      )}
      {live ? (
        <View accessibilityLabel="Available now" style={{ position: 'absolute', right: rounded ? -2 : 0, bottom: rounded ? -2 : 0, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.live, borderWidth: 2, borderColor: colors.white }} />
      ) : null}
    </View>
  );
}
