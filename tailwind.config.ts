import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-instrument-serif)', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        bg: {
          DEFAULT: 'hsl(var(--color-bg) / <alpha-value>)',
          surface: 'hsl(var(--color-surface) / <alpha-value>)',
          'surface-2': 'hsl(var(--color-surface-2) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'hsl(var(--color-border) / <alpha-value>)',
          '2': 'hsl(var(--color-border-2) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'hsl(var(--color-text) / <alpha-value>)',
          muted: 'hsl(var(--color-muted) / <alpha-value>)',
          'muted-2': 'hsl(var(--color-muted-2) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
          '2': 'hsl(var(--color-accent-2) / <alpha-value>)',
        },
        semantic: {
          green: 'hsl(var(--color-green) / <alpha-value>)',
          amber: 'hsl(var(--color-amber) / <alpha-value>)',
          red: 'hsl(var(--color-red) / <alpha-value>)',
          purple: 'hsl(var(--color-purple) / <alpha-value>)',
        },
      },
      spacing: {
        sidebar: '220px',
        topbar: '56px',
      },
      borderRadius: {
        md: '10px',
        lg: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'shake': 'shake 0.3s ease',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 currentColor' },
          '100%': { boxShadow: '0 0 0 10px rgba(currentColor, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
