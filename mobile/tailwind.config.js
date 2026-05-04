/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // SHIPEH brand red, kept identical to the web tailwind.config.ts.
        brand: {
          DEFAULT: "#a31d2a",
          50: "#fdf3f4",
          100: "#fbe6e8",
          200: "#f5c2c7",
          300: "#ec8b95",
          400: "#df5562",
          500: "#c92e3d",
          600: "#a31d2a",
          700: "#7a1620",
          800: "#561017",
          900: "#3a0b10",
        },
      },
    },
  },
  plugins: [],
};
