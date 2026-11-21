import { colors, radius, space, shadow, touchTarget, font, tileColor, tilePalette } from '@help/ui-tokens';
import type { ViewStyle } from 'react-native';

export { colors, radius, space, touchTarget, font, tileColor, tilePalette };

export const shadowSm: ViewStyle = {
  shadowColor: shadow.sm.color, shadowOpacity: shadow.sm.opacity, shadowRadius: shadow.sm.radius,
  shadowOffset: { width: 0, height: shadow.sm.offsetY }, elevation: 2,
};
export const shadowMd: ViewStyle = {
  shadowColor: shadow.md.color, shadowOpacity: shadow.md.opacity, shadowRadius: shadow.md.radius,
  shadowOffset: { width: 0, height: shadow.md.offsetY }, elevation: 6,
};

export const avatarPalette = tilePalette.map((t) => ({ bg: t.bg, fg: t.fg }));
