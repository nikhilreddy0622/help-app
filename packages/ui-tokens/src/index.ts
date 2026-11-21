/**
 * Design tokens shared by mobile (RN) and web. Source: approved design canvas.
 * Teal/green 700 shades are used for text & filled buttons (WCAG AA); PRD
 * originals (#0D9488, #16A34A) for icons/accents only.
 */
export const colors = {
  navy: '#13233F',
  teal: '#0E9384',
  teal700: '#0B7A6E',
  teal800: '#075E55',
  tealTint: '#E7F5F2',
  tealSoft: '#CDEDE6',
  brand: '#0B7A6E',
  brandDeep: '#06574F',
  accent: '#FFC21A',
  accentSoft: '#FFF4CC',
  accentInk: '#5C4300',
  rating: '#1A8F47',
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#121722',
  textMuted: '#6B7280',
  textSubtle: '#3F4652',
  border: '#E6E8EC',
  borderStrong: '#CFD3DA',
  divider: '#EEF0F3',
  surfaceMuted: '#F1F3F5',
  success: '#15803D',
  successBg: '#E2F6E9',
  successFg: '#14632F',
  live: '#16A34A',
  warning: '#D97706',
  warningBg: '#FDF1DC',
  warningFg: '#8A4B08',
  danger: '#C2261F',
  dangerBg: '#FDE8E7',
  infoBg: '#E7F0FB',
  infoFg: '#1D4E89',
  white: '#FFFFFF',
} as const;

/** Colour-coded category tiles (Blinkit/Swiggy style): soft background + matching ink. */
export const tilePalette = [
  { bg: '#E3F4EF', fg: '#0B6E61' },
  { bg: '#FFF1D6', fg: '#9A5B00' },
  { bg: '#E6EEFF', fg: '#2B4FB3' },
  { bg: '#FDE7EC', fg: '#B0284C' },
  { bg: '#EAF6DC', fg: '#3F7A12' },
  { bg: '#F1E8FD', fg: '#6A3BB8' },
  { bg: '#FFE9DF', fg: '#B5461A' },
  { bg: '#E0F4FA', fg: '#0F6F8C' },
] as const;
export const tileColor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return tilePalette[h % tilePalette.length]!;
};

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
/** control 12 · card 16 · sheet 24. Pills only for chips and status. */
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const font = {
  family: 'Inter',
  display: { size: 26, weight: '800', lineHeight: 32, letterSpacing: -0.6 },
  title: { size: 20, weight: '800', lineHeight: 26, letterSpacing: -0.4 },
  heading: { size: 16, weight: '700', lineHeight: 22 },
  body: { size: 15, weight: '400', lineHeight: 22 },
  label: { size: 14, weight: '600', lineHeight: 20 },
  caption: { size: 13, weight: '500', lineHeight: 18 },
  micro: { size: 12, weight: '600', lineHeight: 16 },
} as const;
export const shadow = {
  sm: { color: '#0B1220', opacity: 0.06, radius: 6, offsetY: 2 },
  md: { color: '#0B1220', opacity: 0.1, radius: 18, offsetY: 8 },
} as const;
/** One easing family everywhere (strong ease-out), durations in ms. */
export const motion = { press: 120, small: 180, enter: 240, easeOut: [0.23, 1, 0.32, 1] as const } as const;
export const touchTarget = 44;

/** Provider presence → pill colours (dot + text). Labels come from the API (statusLabel). */
export const presenceStyle: Record<'AVAILABLE' | 'BUSY' | 'AWAY' | 'PAUSED', { bg: string; fg: string; dot: string; name: string }> = {
  AVAILABLE: { bg: colors.successBg, fg: colors.successFg, dot: colors.live, name: 'Available' },
  BUSY: { bg: colors.warningBg, fg: colors.warningFg, dot: colors.warning, name: 'Busy' },
  AWAY: { bg: colors.surfaceMuted, fg: colors.textSubtle, dot: colors.textMuted, name: 'Away' },
  PAUSED: { bg: colors.surfaceMuted, fg: colors.textSubtle, dot: colors.borderStrong, name: 'Hidden from customers' },
};

export const priceUnitLabel: Record<string, string> = {
  HOURLY: '/ hour', PER_VISIT: '/ visit', FIXED: 'fixed', STARTING_AT: 'onwards', PER_DAY: '/ day', PER_SESSION: '/ session',
};
export * from './brand';
