import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "jack-purple": "#6C3FC5",
        "jack-blue": "#2563EB",
        "jack-green": "#16A34A",
        "jack-orange": "#EA580C",
      },
      animation: {
        "spin-slow":    "spin 3s linear infinite",
        "bounce-once":  "bounceOnce 0.6s ease",
      },
      keyframes: {
        bounceOnce: {
          "0%, 100%": { transform: "translateY(0)" },
          "30%":      { transform: "translateY(-20px)" },
          "60%":      { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
