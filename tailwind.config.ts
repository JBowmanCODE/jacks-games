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
    },
  },
  plugins: [],
};

export default config;
