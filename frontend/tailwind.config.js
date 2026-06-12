/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefaf8",
          100: "#d5f2ef",
          500: "#16a394",
          600: "#0f8278",
          700: "#0f6862",
          900: "#103f3d"
        },
        ink: {
          800: "#1f2937",
          900: "#111827"
        }
      },
      boxShadow: {
        soft: "0 18px 55px rgba(15, 23, 42, 0.08)"
      }
    },
  },
  plugins: [],
};
