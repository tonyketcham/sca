import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'Avenir Next',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      }
    }
  },
  plugins: []
} satisfies Config
