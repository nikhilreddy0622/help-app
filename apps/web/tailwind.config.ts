import type { Config } from 'tailwindcss';
import { colors, radius } from '@help/ui-tokens';

// Tokens from packages/ui-tokens mapped into the Tailwind theme.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: colors.navy,
        teal: { DEFAULT: colors.teal, 700: colors.teal700, 800: colors.teal800, tint: colors.tealTint },
        canvas: colors.bg,
        card: colors.card,
        ink: colors.text,
        muted: colors.textMuted,
        subtle: colors.textSubtle,
        line: { DEFAULT: colors.border, strong: colors.borderStrong },
        divider: colors.divider,
        surface: colors.surfaceMuted,
        success: { DEFAULT: colors.success, bg: colors.successBg, fg: colors.successFg },
        warning: { DEFAULT: colors.warning, bg: colors.warningBg, fg: colors.warningFg },
        danger: { DEFAULT: colors.danger, bg: colors.dangerBg },
        info: { bg: colors.infoBg, fg: colors.infoFg },
      },
      borderRadius: { sm: `${radius.sm}px`, md: `${radius.md}px`, lg: `${radius.lg}px`, xl: `${radius.xl}px` },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,0.04)',
        md: '0 4px 12px rgba(15,23,42,0.08)',
      },
      screens: { xs: '360px', md: '768px', lg: '1024px', xl: '1440px' },
    },
  },
  plugins: [],
} satisfies Config;
