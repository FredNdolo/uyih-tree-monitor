/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uyih-green': '#1a7a4c',
        'uyih-green-dark': '#145c39',
        'uyih-orange': '#e85d04',
        'uyih-orange-light': '#f48c06',
        'uyih-cream': '#f8f5f0',
        'uyih-slate': '#1e293b',
      },
    },
  },
  plugins: [],
}