import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0d12",
          800: "#11141b",
          700: "#181c25",
          600: "#1f2533",
          500: "#2a3142",
        },
        accent: {
          500: "#7c5cff",
          400: "#9b86ff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
