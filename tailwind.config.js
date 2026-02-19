/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12",
        paper: "#EEF2FF",
        fog: "#A7B0C6",
        electric: "#2D6BFF",
        graphite: "#11151F",
        amber: "#FFB020",
        teal: "#2EF2C2",
      },
      boxShadow: {
        insetHairline: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
};

