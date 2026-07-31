/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/routes/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Outfit', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        marry: {
          paper: '#fffcfd',
          ink: '#2a1f24',
          muted: '#7a6a70',
          line: '#f0e4e8',
          pink: '#d96b7a',
          deep: '#c44565',
          soft: '#fce8ee'
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c'
        }
      }
    }
  },
  plugins: []
}
