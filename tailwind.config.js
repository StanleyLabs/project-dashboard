/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f6f7fb",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#475569",
        border: "rgba(15, 23, 42, 0.10)",
        brand: "#2563EB",
        brand2: "#7C3AED",
        good: "#16A34A",
        warn: "#F59E0B",
        bad: "#EF4444",
      },
      boxShadow: {
        card: "0 10px 30px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};
