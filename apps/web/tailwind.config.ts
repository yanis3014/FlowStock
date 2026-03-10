import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        // Design system (globals.css)
        'green-deep': '#1A3C34',
        'green-mid': '#2D6A4F',
        'green-bright': '#40916C',
        'green-light': '#B7E4C7',
        cream: '#FAF7F2',
        'cream-dark': '#F0EBE1',
        charcoal: '#1C2B2A',
        'gray-warm': '#6B7B76',
        'red-alert': '#E53E3E',
        'orange-warn': '#ED8936',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Sora', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rush-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'rush-pulse': 'rush-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
