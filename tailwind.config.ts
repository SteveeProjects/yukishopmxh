import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        foreground: '#F8FAFC',
        surface: {
          DEFAULT: '#0E1223',
          hover: '#161C33',
          border: '#1E293B',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          foreground: '#FFFFFF',
        },
        financial: {
          credit: '#10B981',
          debit: '#EF4444',
          neutral: '#94A3B8',
        },
        status: {
          pending: '#F59E0B',
          processing: '#3B82F6',
          completed: '#10B981',
          failed: '#EF4444',
        },
        muted: {
          DEFAULT: '#1E293B',
          foreground: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
