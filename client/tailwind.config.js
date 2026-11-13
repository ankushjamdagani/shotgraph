/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        subtle: 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'accent-primary': 'var(--accent-primary)',
        'dot-color': 'var(--dot-color)',
      },
    },
  },
  plugins: [],
};
