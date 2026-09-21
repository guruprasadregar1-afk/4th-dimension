import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          border: 'var(--surface-border)',
        },
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        canvas: 'var(--canvas)',
        hyperplane: {
          x: 'var(--hyperplane-x)',
          y: 'var(--hyperplane-y)',
          z: 'var(--hyperplane-z)',
          w: 'var(--hyperplane-w)',
        },
      },
      boxShadow: {
        'glow-x': '0 0 12px color-mix(in srgb, var(--hyperplane-x) 50%, transparent)',
        'inner-glow': 'inset 0 0 40px color-mix(in srgb, var(--accent) 8%, transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
