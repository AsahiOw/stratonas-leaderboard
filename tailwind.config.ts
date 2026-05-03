import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        card2: 'var(--card2)',
        border: 'var(--border)',
        border2: 'var(--border2)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        muted2: 'var(--muted2)',
        gold: 'var(--gold)',
        green: 'var(--green)',
        red: 'var(--red)',
      },
      fontFamily: {
        sans: ['var(--font)', 'sans-serif'],
        mono: ['var(--mono)', 'monospace'],
        display: ['var(--font-display)', 'Oswald', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
