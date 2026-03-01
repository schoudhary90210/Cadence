import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        severity: {
          mild: "#22c55e",
          moderate: "#eab308",
          "moderate-severe": "#f97316",
          severe: "#ef4444",
        },
        event: {
          block: "#ef4444",
          repetition: "#8b5cf6",
          prolongation: "#f97316",
          filler: "#6b7280",
          interjection: "#3b82f6",
        },
      },
      animation: {
        "gauge-fill": "gauge-fill 1.2s ease-out forwards",
      },
      keyframes: {
        "gauge-fill": {
          "0%": { strokeDashoffset: "339" },
          "100%": { strokeDashoffset: "var(--gauge-offset)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
