/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // AcadFlow Brand Palette
        indigo: {
          brand: '#6C63FF',
        },
        cyan: {
          brand: '#00F5D4',
        },
        // Semantic
        danger:  'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        // Dark/Light surfaces
        bg:      'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card:    'rgb(var(--color-card) / <alpha-value>)',
        text:    'rgb(var(--color-text) / <alpha-value>)',
        border:  'rgb(var(--color-border) / <alpha-value>)',
        // Attendance zones
        'zone-safe':        'rgb(var(--color-success) / <alpha-value>)',
        'zone-okay':        '#00C9B1',
        'zone-condonable':  'rgb(var(--color-warning) / <alpha-value>)',
        'zone-critical':    'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
      boxShadow: {
        glow:        '0 0 20px rgba(108,99,255,0.3)',
        'glow-cyan': '0 0 20px rgba(0,245,212,0.3)',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                      to: { opacity: '1' } },
        slideUp:  { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseDot: { '0%,100%': { opacity: '1' },                 '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}
