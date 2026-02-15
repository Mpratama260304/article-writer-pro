/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f23',
          sidebar: '#151530',
          card: '#1a1a3e',
          hover: '#222255',
        },
        muted: '#555577',
        secondary: '#8888aa',
        accent: {
          green: '#10b981',
          orange: '#f59e0b',
          blue: '#3b82f6',
          red: '#ef4444',
          yellow: '#eab308',
          purple: '#8b5cf6',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
