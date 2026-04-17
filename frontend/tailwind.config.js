/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional sports theme palette
        bg: {
          DEFAULT: '#0a0f0d', // Deep dark background
          light: '#141a16', // Slightly lighter background
        },
        panel: {
          DEFAULT: '#1a2420', // Panel background
          light: '#25302b', // Lighter panel
          dark: '#121915', // Darker panel
        },
        primary: {
          DEFAULT: '#10b981', // Emerald green (field color)
          light: '#34d399', // Lighter emerald
          dark: '#059669', // Darker emerald
        },
        secondary: {
          DEFAULT: '#3b82f6', // Blue (complementary)
          light: '#60a5fa',
          dark: '#2563eb',
        },
        accent: {
          DEFAULT: '#f59e0b', // Amber/gold (energy, premium)
          light: '#fbbf24',
          dark: '#d97706',
        },
        text: {
          DEFAULT: '#f0fdf4', // Light green-white
          muted: '#86efac', // Muted green
          dark: '#166534', // Dark green text
        },
        border: {
          DEFAULT: '#22c55e', // Green border
          light: '#4ade80',
          dark: '#16a34a',
        },
        white: '#ffffff',
        black: '#000000',
      },
      fontFamily: {
        heading: ['Bebas Neue', 'Barlow Condensed', 'sans-serif'],
        body: ['DM Sans', 'Outfit', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'slide-left': 'slideLeft 0.5s ease-out',
        'slide-right': 'slideRight 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
}
