/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#120d16",
          dark: "#0b070f",
          light: "#1a1320",
        },
        surface: {
          DEFAULT: "#241927",
          hover: "#2d2031",
          light: "#342438",
        },
        plum: {
          DEFAULT: "#35203d",
          light: "#4a2d56",
        },
        cream: {
          DEFAULT: "#fff7ef",
          muted: "#e8ded4",
        },
        pink: {
          DEFAULT: "#e91671",
          hover: "#ff2082",
          glow: "rgba(233, 22, 113, 0.25)",
        },
        lilac: {
          DEFAULT: "#d5c6eb",
          muted: "#b39ecf",
        },
        line: {
          DEFAULT: "#493449",
          light: "#5c435c",
        },
      },
      fontFamily: {
        sans: ["DM", "system-ui", "sans-serif"],
        serif: ["Playfair", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(233, 22, 113, 0.25)",
        "glow-lg": "0 0 35px rgba(233, 22, 113, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
