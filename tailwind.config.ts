import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        background: 'oklch(var(--background) / <alpha-value>)',
        surface: 'oklch(var(--surface) / <alpha-value>)',
        surfaceHover: 'oklch(var(--surface-hover) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        borderHover: 'oklch(var(--border-hover) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        muted: 'oklch(var(--muted) / <alpha-value>)',
        primary: 'oklch(var(--primary) / <alpha-value>)',
        primaryHover: 'oklch(var(--primary-hover) / <alpha-value>)',
        primaryForeground: 'oklch(var(--primary-foreground) / <alpha-value>)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
