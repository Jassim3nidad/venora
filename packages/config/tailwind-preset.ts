import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

/**
 * Shared Tailwind CSS preset for all Venora apps.
 * Extend this in your app's tailwind.config.ts.
 */
const preset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        display: ["var(--font-sora)", ...fontFamily.sans],
      },
      colors: {
        brand: {
          50:  "hsl(217 91% 97%)",
          100: "hsl(217 91% 93%)",
          200: "hsl(217 91% 85%)",
          300: "hsl(217 91% 74%)",
          400: "hsl(217 91% 63%)",
          500: "hsl(217 91% 55%)",
          600: "hsl(217 91% 47%)",
          700: "hsl(217 91% 39%)",
          800: "hsl(217 91% 31%)",
          900: "hsl(217 91% 23%)",
          950: "hsl(217 91% 15%)",
        },
        accent: {
          50:  "hsl(45 100% 97%)",
          400: "hsl(45 96%  65%)",
          500: "hsl(45 96%  54%)",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 1.5s infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
};

export default preset;
