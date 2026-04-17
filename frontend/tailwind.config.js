/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1f16',
        panel: '#132b1c',
        primary: '#1a6b3c',
        accent: '#c8ff00',
        text: '#e8f5e9',
        border: '#2d5a3d',
        white: '#ffffff',
      },
      fontFamily: {
        heading: ['Bebas Neue', 'Barlow Condensed', 'sans-serif'],
        body: ['DM Sans', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
