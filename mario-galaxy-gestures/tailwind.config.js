/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "secondary-container": "#6d5e00",
        "on-secondary": "#5a4e00",
        "secondary": "#fcdc00",
        "secondary-dim": "#ecce00",
        "primary-dim": "#00e6e6",
        "surface-bright": "#222c41",
        "surface-container-lowest": "#000000",
        "outline-variant": "#414857",
        "background": "#070e1b",
        "on-background": "#e2e8fb",
        "on-surface": "#e2e8fb",
        "surface": "#070e1b",
        "primary": "#c1fffe",
        "primary-container": "#00ffff",
        "surface-container-low": "#0c1322",
        "surface-container": "#11192a",
        "surface-container-high": "#172031",
        "surface-container-highest": "#1c2639"
      },
      fontFamily: {
        "headline": ["Space Grotesk", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
