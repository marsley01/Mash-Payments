import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
      },
      colors: {
        background: "#0A0A0A",
        foreground: "#ededed",
        accent: "#00C896",
        "accent-dark": "#00A87A",
        muted: "#888888",
        "surface-dark": "#141414",
        "surface-light": "#1E1E1E",
        success: "#00C896",
        warning: "#F5A623",
        danger: "#FF4D4D",
      },
    },
  },
  plugins: [],
};
export default config;
