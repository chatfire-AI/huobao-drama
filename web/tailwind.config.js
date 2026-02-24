/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand colors / 主品牌色
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Neutral colors for backgrounds / 中性色背景 (references CSS variables from main.css)
        surface: {
          light: 'var(--bg-secondary)',
          DEFAULT: 'var(--bg-primary)',
          dark: 'var(--bg-primary)',
        },
        // Card backgrounds / 卡片背景
        card: {
          light: 'var(--bg-card)',
          dark: 'var(--bg-card)',
        },
        // Border colors / 边框色
        border: {
          light: 'var(--border-primary)',
          dark: 'var(--border-secondary)',
        },
        // Text colors / 文字色
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          'primary-dark': 'var(--text-primary)',
          'secondary-dark': 'var(--text-secondary)',
          'muted-dark': 'var(--text-muted)',
        },
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'card-dark': 'var(--shadow-card)',
        'card-hover-dark': 'var(--shadow-card-hover)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
