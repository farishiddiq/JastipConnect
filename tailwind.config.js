import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

/**
 * Theme tokens. Every themable color is a CSS variable holding "R G B" channels,
 * so Tailwind opacity modifiers (bg-white/90) keep working in both modes.
 * Light values follow the brand (navy #12233F, turquoise #16B8A6); dark values are
 * hand-tuned inversions so tints become deep surfaces and dark text becomes light.
 */
const PALETTE = {
  white: ['#FFFFFF', '#111D30'],
  background: ['#F7F7F7', '#0A1424'],
  border: ['#E6E6E6', '#22324B'],
  shadow: ['#12233F', '#000000'],
  slate: {
    50: ['#F7F7F7', '#0E1828'], 100: ['#EDEDED', '#152238'], 200: ['#E1E3E6', '#1F2E47'], 300: ['#CDD0D5', '#2F405C'],
    400: ['#6B7078', '#7A8BA5'], 500: ['#5C6168', '#9AA9BF'], 600: ['#464A51', '#B5C1D2'], 700: ['#33363B', '#CDD6E2'],
    800: ['#222428', '#E2E8F0'], 900: ['#121316', '#F1F5F9'],
  },
  navy: {
    50: ['#EEF2F8', '#14233A'], 100: ['#D9E1EE', '#1B2D4A'], 200: ['#B0C0DA', '#2A4166'], 300: ['#7F96BD', '#4D6690'],
    400: ['#4F6A98', '#7E95BC'], 500: ['#2F4A76', '#A6B8D6'], 600: ['#1F365C', '#C4D1E6'], 700: ['#12233F', '#E6ECF5'],
    800: ['#0C1830', '#F1F5FA'], 900: ['#070F1F', '#FAFCFE'],
  },
  teal: {
    50: ['#E8FAF7', '#0D2A2D'], 100: ['#C8F2EC', '#113936'], 200: ['#93E5DA', '#165049'], 300: ['#58D3C3', '#1E7A6F'],
    400: ['#2BC4B2', '#22A595'], 500: ['#16B8A6', '#2CC4B1'], 600: ['#0F9586', '#4FD3C2'], 700: ['#0B6F65', '#7CE0D3'],
    800: ['#0F5D55', '#A8ECE3'], 900: ['#0E4C46', '#D2F6F1'],
  },
  amber: {
    50: ['#FFFBEB', '#2A1E08'], 100: ['#FEF3C7', '#3A2A0B'], 200: ['#FDE68A', '#5C4210'], 300: ['#FCD34D', '#8C6417'],
    400: ['#FBBF24', '#C98D1E'], 500: ['#F59E0B', '#F0A92A'], 600: ['#D97706', '#F5BC4D'], 700: ['#B45309', '#F8CD74'],
    800: ['#92400E', '#FBDE9E'], 900: ['#78350F', '#FDECC6'], 950: ['#451A03', '#FEF6E2'],
  },
  red: {
    50: ['#FEF2F2', '#2E1215'], 100: ['#FEE2E2', '#3F171B'], 200: ['#FECACA', '#5E1F25'], 300: ['#FCA5A5', '#8A2C33'],
    400: ['#F87171', '#C2414A'], 500: ['#EF4444', '#E5555D'], 600: ['#DC2626', '#F07178'], 700: ['#B91C1C', '#F59A9F'],
    800: ['#991B1B', '#F9C0C3'], 900: ['#7F1D1D', '#FCE0E1'],
  },
  emerald: {
    50: ['#ECFDF5', '#0B2A20'], 100: ['#D1FAE5', '#0F3A2C'], 200: ['#A7F3D0', '#155341'], 300: ['#6EE7B7', '#1D7A5D'],
    400: ['#34D399', '#25A57C'], 500: ['#10B981', '#34C08F'], 600: ['#059669', '#5BD3A6'], 700: ['#047857', '#8AE2C1'],
    800: ['#065F46', '#B6EED8'], 900: ['#064E3B', '#DBF7EC'],
  },
  sky: {
    50: ['#F0F9FF', '#0B2233'], 100: ['#E0F2FE', '#0F2E45'], 200: ['#BAE6FD', '#164466'], 300: ['#7DD3FC', '#1F6491'],
    400: ['#38BDF8', '#2B8BC4'], 500: ['#0EA5E9', '#3AA6DE'], 600: ['#0284C7', '#63BCEA'], 700: ['#0369A1', '#8FD0F1'],
    800: ['#075985', '#BBE3F7'], 900: ['#0C4A6E', '#DDF1FB'],
  },
};

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

function buildVars(index) {
  const vars = {};
  for (const [name, value] of Object.entries(PALETTE)) {
    if (Array.isArray(value)) vars[`--c-${name}`] = channels(value[index]);
    else for (const [shade, pair] of Object.entries(value)) vars[`--c-${name}-${shade}`] = channels(pair[index]);
  }
  return vars;
}

const ref = (key) => `rgb(var(--c-${key}) / <alpha-value>)`;
const colors = {};
for (const [name, value] of Object.entries(PALETTE)) {
  if (Array.isArray(value)) colors[name] = ref(name);
  else colors[name] = Object.fromEntries(Object.keys(value).map((s) => [s, ref(`${name}-${s}`)]));
}
colors.navy.DEFAULT = ref('navy-700');
colors.teal.DEFAULT = ref('teal-500');

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ...colors,
        // Fixed (non-theming) tones for content over photography.
        deep: '#0A1628',
        snow: '#FFFFFF',
        mint: '#93E5DA',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--c-shadow) / 0.05), 0 10px 28px -14px rgb(var(--c-shadow) / 0.18)',
        lift: '0 2px 6px rgb(var(--c-shadow) / 0.06), 0 18px 40px -12px rgb(var(--c-shadow) / 0.22)',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
    },
  },
  plugins: [
    animate,
    plugin(({ addBase }) => {
      const dark = { ...buildVars(1), colorScheme: 'dark' };
      addBase({
        ':root': { ...buildVars(0), colorScheme: 'light' },
        '@media (prefers-color-scheme: dark)': { ':root:not([data-theme="light"])': dark },
        ':root[data-theme="dark"]': dark,
      });
    }),
  ],
};
