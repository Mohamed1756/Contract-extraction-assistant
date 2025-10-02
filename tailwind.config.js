/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'editorial': ['"Playfair Display"', 'serif'],
        'editorial-light': ['"Playfair Display"', 'serif'],
        'editorial-medium': ['"Playfair Display"', 'serif'],
        'editorial-bold': ['"Playfair Display"', 'serif'],
        'serif': ['"Playfair Display"', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        'sans': ['"Playfair Display"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7cfc7',
          300: '#a3b0a3',
          400: '#7a8a7a',
          500: '#5d6f5d',
          600: '#4a5a4a',
          700: '#3d4a3d',
          800: '#333d33',
          900: '#2b332b',
        },
        forest: {
          50: '#f0f4f0',
          100: '#dce7dc',
          200: '#bad0ba',
          300: '#91b291',
          400: '#6b926b',
          500: '#4f7a4f',
          600: '#3d603d',
          700: '#324d32',
          800: '#2a3f2a',
          900: '#243524',
        },
        'true-turquoise': '#20808D',
        'off-black': '#091717',
        'paper-white': '#FBFAF4',
        'soft-gray': '#E0E0E0',
        'ivory': '#000000',
      }
    },
  },
  plugins: [],
};