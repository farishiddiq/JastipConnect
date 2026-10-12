import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#12233F',
          50: '#EEF2F8',
          100: '#D9E1EE',
          200: '#B0C0DA',
          300: '#7F96BD',
          400: '#4F6A98',
          500: '#2F4A76',
          600: '#1F365C',
          700: '#12233F',
          800: '#0C1830',
          900: '#070F1F',
        },
        teal: {
          DEFAULT: '#16B8A6',
          50: '#E8FAF7',
          100: '#C8F2EC',
          200: '#93E5DA',
          300: '#58D3C3',
          400: '#2BC4B2',
          500: '#16B8A6',
          600: '#0F9586',
          700: '#0E766B',
          800: '#0F5D55',
          900: '#0E4C46',
        },
        border: '#E2E8F0',
        background: '#F8FAFC',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,35,63,0.04), 0 4px 16px rgba(18,35,63,0.06)',
        lift: '0 4px 8px rgba(18,35,63,0.06), 0 12px 32px rgba(18,35,63,0.10)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
    },
  },
  plugins: [animate],
};
