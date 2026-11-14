/**
 * Design tokens shared by mobile (RN) and web. Source: approved design canvas.
 * Teal/green 700 shades are used for text & filled buttons (WCAG AA); PRD
 * originals (#0D9488, #16A34A) for icons/accents only.
 */
export const colors = {
  navy: '#172B4D',
  teal: '#0D9488',
  teal700: '#0F766E',
  teal800: '#115E59',
  tealTint: '#F0FDFA',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textMuted: '#64748B',
  textSubtle: '#475569',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#F1F5F9',
  surfaceMuted: '#F1F5F9',
  success: '#15803D',
  successBg: '#DCFCE7',
  successFg: '#166534',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningFg: '#92400E',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  infoBg: '#E0F2FE',
  infoFg: '#075985',
  white: '#FFFFFF',
} as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const font = {
  family: 'Inter',
  display: { size: 26, weight: '700', lineHeight: 32, letterSpacing: -0.4 },
  title: { size: 20, weight: '600', lineHeight: 26 },
  heading: { size: 17, weight: '600', lineHeight: 22 },
  body: { size: 15, weight: '400', lineHeight: 22 },
  label: { size: 14, weight: '500', lineHeight: 20 },
  caption: { size: 13, weight: '400', lineHeight: 18 },
  micro: { size: 12, weight: '600', lineHeight: 16 },
} as const;
export const shadow = {
  sm: { color: '#0F172A', opacity: 0.04, radius: 2, offsetY: 1 },
  md: { color: '#0F172A', opacity: 0.08, radius: 12, offsetY: 4 },
} as const;
export const touchTarget = 44;

/** Provider presence → pill colours (dot + text). Labels come from the API (statusLabel). */
export const presenceStyle: Record<'AVAILABLE' | 'BUSY' | 'AWAY' | 'PAUSED', { bg: string; fg: string; dot: string; name: string }> = {
  AVAILABLE: { bg: colors.successBg, fg: colors.successFg, dot: colors.success, name: 'Available' },
  BUSY: { bg: colors.warningBg, fg: colors.warningFg, dot: colors.warning, name: 'Busy' },
  AWAY: { bg: colors.surfaceMuted, fg: '#334155', dot: colors.textMuted, name: 'Away' },
  PAUSED: { bg: colors.surfaceMuted, fg: '#334155', dot: colors.borderStrong, name: 'Hidden from customers' },
};

export const priceUnitLabel: Record<string, string> = {
  HOURLY: '/ hour', PER_VISIT: '/ visit', FIXED: 'fixed', STARTING_AT: 'onwards', PER_DAY: '/ day', PER_SESSION: '/ session',
};
export * from './brand';
