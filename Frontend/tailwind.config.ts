import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',

        /* Neon gradient palette */
        neon: {
          blue: '#3b82f6',
          'electric-blue': '#0ea5e9',
          purple: '#a855f7',
          'cyber-purple': '#7c3aed',
          pink: '#ec4899',
          'hot-pink': '#f43f5e',
          cyan: '#06b6d4',
          'neon-cyan': '#22d3ee',
        },

        /* Market state colors */
        market: {
          bullish: '#22c55e',
          'bullish-bright': '#4ade80',
          bearish: '#ef4444',
          'bearish-bright': '#f97316',
          neutral: '#8b5cf6',
          'neutral-bright': '#a78bfa',
        },

        /* Glow accent colors */
        glow: {
          cyan: '#22d3ee',
          magenta: '#e879f9',
          yellow: '#facc15',
          green: '#4ade80',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundSize: {
        '200%': '200%',
        '300%': '300%',
        '400%': '400%',
      },
      keyframes: {
        /* --- Entrance animations --- */
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.08)' },
          '70%': { transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'flip-in': {
          '0%': { opacity: '0', transform: 'perspective(600px) rotateY(-90deg)' },
          '100%': { opacity: '1', transform: 'perspective(600px) rotateY(0deg)' },
        },
        'spiral-in': {
          '0%': { opacity: '0', transform: 'rotate(-180deg) scale(0)' },
          '100%': { opacity: '1', transform: 'rotate(0deg) scale(1)' },
        },

        /* --- Ambient / looping animations --- */
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        tilt: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        magnetic: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(2px, -2px)' },
          '50%': { transform: 'translate(-1px, 1px)' },
          '75%': { transform: 'translate(1px, -1px)' },
        },

        /* --- Card / container animations --- */
        'morph-card': {
          '0%, 100%': { borderRadius: '12px' },
          '50%': { borderRadius: '24px 8px 24px 8px' },
        },
        'expand-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.5)' },
          '100%': { boxShadow: '0 0 0 16px rgba(34,211,238,0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },

        /* --- Loading / progress animations --- */
        'skeleton-wave': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress, 100%)' },
        },
        'dots-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        'spinner-orbit': {
          '0%': { transform: 'rotate(0deg) translateX(10px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(10px) rotate(-360deg)' },
        },

        /* --- Feedback animations --- */
        'success-confetti': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '0.8' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        'shake-error': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        celebrate: {
          '0%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.15) rotate(-3deg)' },
          '30%': { transform: 'scale(1.15) rotate(3deg)' },
          '45%': { transform: 'scale(1)' },
        },

        /* --- Interactive / hover animations --- */
        'ripple-expand': {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'card-tilt': {
          '0%': { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' },
          '100%': { transform: 'perspective(1000px) rotateX(var(--tilt-x, 5deg)) rotateY(var(--tilt-y, 5deg))' },
        },
        'perspective-hover': {
          '0%': { transform: 'perspective(800px) rotateY(0deg)' },
          '100%': { transform: 'perspective(800px) rotateY(8deg)' },
        },
        'flip-card': {
          '0%': { transform: 'perspective(800px) rotateY(0deg)' },
          '100%': { transform: 'perspective(800px) rotateY(180deg)' },
        },

        /* --- Background / decorative animations --- */
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'mesh-shift': {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
        },
        'hue-rotate': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        /* Entrances */
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slide-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'flip-in': 'flip-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'spiral-in': 'spiral-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',

        /* Ambient */
        shimmer: 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'rotate-slow': 'rotate-slow 8s linear infinite',
        tilt: 'tilt 4s ease-in-out infinite',
        magnetic: 'magnetic 2s ease-in-out infinite',

        /* Card / container */
        'morph-card': 'morph-card 6s ease-in-out infinite',
        'expand-glow': 'expand-glow 1.5s ease-out infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',

        /* Loading */
        'skeleton-wave': 'skeleton-wave 1.8s ease-in-out infinite',
        'progress-fill': 'progress-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dots-bounce': 'dots-bounce 1.4s ease-in-out infinite both',
        'spinner-orbit': 'spinner-orbit 1.2s linear infinite',

        /* Feedback */
        'success-confetti': 'success-confetti 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shake-error': 'shake-error 0.5s ease-in-out',
        celebrate: 'celebrate 0.5s ease-in-out',

        /* Interactive */
        'ripple-expand': 'ripple-expand 0.6s ease-out forwards',
        'card-tilt': 'card-tilt 0.3s ease-out forwards',
        'perspective-hover': 'perspective-hover 0.4s ease-out forwards',
        'flip-card': 'flip-card 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',

        /* Decorative */
        aurora: 'aurora 8s ease-in-out infinite',
        'mesh-shift': 'mesh-shift 12s ease-in-out infinite',
        'hue-rotate': 'hue-rotate 6s linear infinite',
        'gradient-x': 'gradient-x 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
