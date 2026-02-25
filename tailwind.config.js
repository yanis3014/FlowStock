/**
 * Tailwind CSS - Configuration charte FlowStock
 * Alignée sur apps/api/public/css/design-system.css (docs/front-end-spec.md §7.1)
 * Utilisable avec build PostCSS ; pour CDN MVP, la même config est injectée inline dans les pages.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./apps/api/public/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
};
