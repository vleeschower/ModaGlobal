/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#163d3d",
        "primary-esmeralda": "#2cb18f",
        surface: "#f8fafa",
        "on-surface": "#191c1d",
        secondary: "#596060",
        "outline-variant": "#c0c8c7",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Public Sans", "sans-serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}