import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * Shared Tailwind CSS preset for 7TH SOUTH STREET.
 * Extend this in your app's tailwind.config.ts.
 */
const preset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-cormorant-garamond)", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        brand: {
          50: "#FCFBF9",
          100: "#F5F2EE",
          200: "#EBE3D5",
          300: "#DFC5A8",
          400: "#D4B68D",
          500: "#C9A96E",
          600: "#B89659",
          700: "#9A7C46",
          800: "#7E6539",
          900: "#65502E",
          950: "#362A17",
        },
        accent: {
          50: "#FCFBF9",
          400: "#D4B68D",
          500: "#C9A96E",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "sheet-in": "sheet-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "sheet-out": "sheet-out 0.25s ease-in",
        "drawer-in": "drawer-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "drawer-out": "drawer-out 0.22s ease-in",
        "scale-in": "scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-out": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "drawer-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(-4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
};

export default preset;
