import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        portic: { DEFAULT: "#1e3a5f", light: "#2d5a8a" },
        viaturas: { DEFAULT: "#0891b2", light: "#22d3ee" },
      },
    },
  },
  plugins: [],
};
export default config;
