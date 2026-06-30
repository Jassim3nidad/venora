import type { Config } from "tailwindcss";
// Imports the shared configuration package directly
import preset from "@venora/config/tailwind-preset"; // Adjust this path if your preset is in a different folder

const config: Config = {
  // 1. Inherit all your Venora brand colors and Stitch tokens
  presets: [preset],
  
  // 2. Tell Tailwind exactly where to look for classes
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <-- This tells it to scan your new components!
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;