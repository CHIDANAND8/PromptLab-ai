/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#171717',
        surfaceHighlight: '#262626',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        textMain: '#f5f5f5',
        textMuted: '#a3a3a3',
        border: '#262626'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
