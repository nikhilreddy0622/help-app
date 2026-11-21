import type { Config } from 'tailwindcss';
import { colors } from '@help/ui-tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: colors.navy,
        brand: { DEFAULT: colors.brand, deep: colors.brandDeep },
        accent: { DEFAULT: colors.accent, soft: colors.accentSoft, ink: colors.accentInk },
        card: colors.card,
        divider: colors.divider,
        teal: { DEFAULT: colors.teal, 700: colors.teal700, 800: colors.teal800, tint: colors.tealTint },
        bg: colors.bg,
        ink: colors.text,
        muted: colors.textMuted,
        subtle: colors.textSubtle,
        line: colors.border,
        danger: colors.danger,
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '10px', lg: '16px', xl: '20px' },
    },
  },
  plugins: [],
} satisfies Config;
