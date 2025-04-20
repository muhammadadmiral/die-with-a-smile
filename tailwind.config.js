/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "*.{js,ts,jsx,tsx,mdx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf2f4",
          100: "#fbe8ec",
          200: "#f9d0da",
          300: "#f4a9be",
          400: "#ed7598",
          500: "#e34a7b",
          600: "#d22c5e",
          700: "#b01e4b",
          800: "#931c42",
          900: "#7c1c3c",
          950: "#4a0a1f",
        },
        secondary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        accent: {
          50: "#fbf7ed",
          100: "#f6efd0",
          200: "#eedb9b",
          300: "#e6c45c",
          400: "#e0b033",
          500: "#d49b1f",
          600: "#b87b17",
          700: "#955a16",
          800: "#7a4819",
          900: "#663c19",
          950: "#3c1f0c",
        },
        dark: {
          50: "#f4f5fb",
          100: "#e9ebf5",
          200: "#d3d7eb",
          300: "#b0b7db",
          400: "#8a93c8",
          500: "#6b74b5",
          600: "#545c9c",
          700: "#444a7f",
          800: "#3a406a",
          900: "#333959",
          950: "#0f0f23",
        },
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Montserrat", "sans-serif"],
        accent: ["Playfair Display", "serif"],
        elegant: ["Cormorant Garamond", "serif"],
        modern: ["Syncopate", "sans-serif"],
        minimal: ["Poiret One", "cursive"],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulse: "pulse 4s ease-in-out infinite",
        spin: "spin 10s linear infinite",
        shimmer: "shimmer 2s infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        textGlow: "textGlow 2s ease-in-out infinite alternate",
        gradientFlow: "gradientFlow 8s ease infinite",
        rotateRecord: "rotateRecord 8s linear infinite",
        breathe: "breathe 8s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%": { filter: "drop-shadow(0 0 2px rgba(227, 74, 123, 0.5))" },
          "100%": { 
            filter: "drop-shadow(0 0 10px rgba(227, 74, 123, 0.8)) drop-shadow(0 0 20px rgba(123, 58, 237, 0.4))" 
          },
        },
        textGlow: {
          "0%": { textShadow: "0 0 5px rgba(227, 74, 123, 0.5)" },
          "100%": { 
            textShadow: "0 0 15px rgba(227, 74, 123, 0.8), 0 0 30px rgba(123, 58, 237, 0.6)" 
          },
        },
        gradientFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        rotateRecord: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))",
        "gradient-gold": "linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
        "velvet-gradient": "linear-gradient(to right, #7c3aed, #e34a7b, #7c3aed)",
        "noise-pattern": "url('/noise-texture.png')",
        "starry-night": "radial-gradient(ellipse at bottom, rgba(30, 30, 60, 1) 0%, rgba(10, 10, 20, 1) 100%)",
      },
      boxShadow: {
        glow: "0 0 10px rgba(227, 74, 123, 0.5), 0 0 20px rgba(123, 58, 237, 0.3)",
        "glow-strong": "0 0 15px rgba(227, 74, 123, 0.7), 0 0 30px rgba(123, 58, 237, 0.5)",
        "inner-light": "inset 0 2px 3px rgba(255, 255, 255, 0.1)",
        "record": "0 10px 30px rgba(0, 0, 0, 0.3), 0 0 60px rgba(227, 74, 123, 0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        ".text-shadow-sm": {
          textShadow: "0 1px 2px rgba(0,0,0,0.2)",
        },
        ".text-shadow": {
          textShadow: "0 2px 4px rgba(0,0,0,0.2)",
        },
        ".text-shadow-md": {
          textShadow: "0 4px 8px rgba(0,0,0,0.2)",
        },
        ".text-shadow-lg": {
          textShadow: "0 8px 16px rgba(0,0,0,0.2)",
        },
        ".text-shadow-glow": {
          textShadow: "0 0 10px rgba(227, 74, 123, 0.7), 0 0 20px rgba(123, 58, 237, 0.5)",
        },
        ".text-shadow-gold": {
          textShadow: "0 0 10px rgba(212, 155, 31, 0.7), 0 0 20px rgba(212, 155, 31, 0.5)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
}