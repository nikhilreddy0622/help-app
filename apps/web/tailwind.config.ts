import type { Config } from 'tailwindcss';
import { colors } from '@help/ui-tokens';

// Tokens from packages/ui-tokens mapped into the Tailwind theme.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: colors.navy,
        brand: { DEFAULT: colors.brand, deep: colors.brandDeep },
        accent: { DEFAULT: colors.accent, soft: colors.accentSoft, ink: colors.accentInk },
        rating: colors.rating,
        live: colors.live,
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
      borderRadius: { sm: '10px', md: '14px', lg: '20px', xl: '28px' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        sm: '0 2px 6px rgba(11,18,32,0.06)',
        md: '0 8px 24px rgba(11,18,32,0.10)',
        lift: '0 12px 32px rgba(11,18,32,0.14)',
      },
      screens: { xs: '360px', md: '768px', lg: '1024px', xl: '1440px' },
    },
  },
  plugins: [],
} satisfies Config;
