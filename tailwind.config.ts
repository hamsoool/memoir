import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2E8D3', // base page background — warm print paper
        'paper-light': '#FBF6EA', // lighter stock, used for print borders/cards
        ink: '#2C231B', // near-black walnut brown — primary text
        rust: '#A8432B', // brick-red accent — the one bold color (shutter button)
        'rust-dark': '#8A3520',
        mustard: '#C99A3A', // gold trim — secondary accent, used sparingly
        teal: '#2F4F4C', // deep postcard-ink teal — links, secondary emphasis
        line: '#C9BA95', // muted hairline / border tone
        tape: '#E7D9AE', // washi-tape color for corner accents
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        stamp: ['var(--font-stamp)', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>\")",
      },
      boxShadow: {
        print: '0 1px 0 rgba(44,35,27,0.06), 0 8px 16px -8px rgba(44,35,27,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
