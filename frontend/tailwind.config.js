/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        emperor: {
          gold: '#D4A843',
          'gold-light': '#E8C96A',
          'gold-dark': '#B88A2D',
          black: '#0A0A0A',
          charcoal: '#1A1A1E',
          slate: '#2A2A30',
          smoke: '#3A3A42',
          cream: '#F5F0E8',
          'cream-dark': '#E8DFD0',
          white: '#FAFAF8',
        },
        accent: {
          emerald: '#2DD4A0',
          red: '#EF4444',
          amber: '#F59E0B',
          blue: '#3B82F6',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 168, 67, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(212, 168, 67, 0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(212, 168, 67, 0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(212, 168, 67, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gold-shimmer': 'linear-gradient(110deg, transparent 33%, rgba(212,168,67,0.08) 50%, transparent 67%)',
      },
    },
  },
  plugins: [],
}
