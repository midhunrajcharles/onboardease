/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: {
          50:  '#F0F7FF',  // Alice blue — near white
          100: '#D9EEFF',  // Very soft pastel blue
          200: '#B3D8FF',  // Light pastel blue
          300: '#7DBCF5',  // Pastel blue
          400: '#4EA0EB',  // Medium pastel blue
          500: '#2B85DC',  // Brand blue
          600: '#1F6EC4',  // Medium-dark blue
          700: '#1558A8',  // Dark blue
          800: '#0E4290',  // Very dark blue
          900: '#072F70',  // Navy
        },
        accent: {
          green: '#90EE90',
          orange: '#FFB347',
          red: '#FFB6C1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
