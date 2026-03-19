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
        felt: {
          DEFAULT: '#1a4731',
          dark: '#0f2d1e',
          light: '#235c3e',
        },
        card: {
          back: '#1e3a8a',
          red: '#dc2626',
          black: '#111827',
        },
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'flip-in': {
          '0%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(250,204,21,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(250,204,21,0.9)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'flip-in': 'flip-in 0.3s ease-out',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
