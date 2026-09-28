import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        ink: {
          50: "#F8F8FB",
          100: "#F1F1F6",
          200: "#E4E4EC",
          300: "#D1D1DC",
          400: "#9C9CAD",
          500: "#6E6E82",
          600: "#4F4F63",
          700: "#37374A",
          800: "#232332",
          900: "#15151F",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16,15,40,0.04), 0 1px 8px -2px rgba(16,15,40,0.06)",
        pop: "0 12px 32px -8px rgba(76,29,149,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-ring": { "0%": { boxShadow: "0 0 0 0 rgba(124,58,237,0.35)" }, "100%": { boxShadow: "0 0 0 8px rgba(124,58,237,0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
