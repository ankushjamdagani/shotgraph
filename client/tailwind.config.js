/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0A0D14',
          surface: '#111726',
          border: '#1F293D',
          hover: '#1B2438',
          accent: '#38BDF8',
          accentHover: '#0EA5E9',
          textMuted: '#94A3B8',
          textBright: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};
