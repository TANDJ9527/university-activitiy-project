/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 24px -4px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.08)',
        'card-hover': '0 12px 40px -8px rgba(79, 70, 229, 0.15), 0 0 0 1px rgba(129, 140, 248, 0.2)',
        'glow-indigo': '0 0 40px -8px rgba(99, 102, 241, 0.35)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.45s ease-out forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
