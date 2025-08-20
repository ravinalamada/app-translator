/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          200: '#8da5d5',
          300: '#86A9D5',
          500: '#3376CD',
          550: '#0067C7',
          600: '#004B93',
          700: '#014C93',
          800: '#004281',
          900: '#02407c',
        },
      }
    },
  },
  plugins: [],
}

