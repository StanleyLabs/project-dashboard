/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sidebar / chrome
        sidebar: {
          DEFAULT: "#1a1a2e",
          hover: "#22223a",
          active: "#2a2a45",
          border: "#2e2e4a",
          muted: "#8888a4",
        },
        // Accent
        accent: {
          DEFAULT: "#6c5ce7",
          light: "#a29bfe",
          dark: "#5a4bd1",
          muted: "rgba(108, 92, 231, 0.15)",
        },
        // Status colors
        status: {
          backlog: "#8888a4",
          todo: "#4ea8de",
          progress: "#f4a261",
          done: "#2dd4a8",
        },
        // Priority
        pri: {
          urgent: "#ff6b6b",
          high: "#f4a261",
          medium: "#ffd166",
          low: "#8888a4",
        },
        // Surfaces
        canvas: "#f0f0f5",
        surface: "#ffffff",
        raised: "#fafafc",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        lifted: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
        overlay: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
        glow: "0 0 20px rgba(108, 92, 231, 0.15)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      animation: {
        "fade-in": "fadeIn 150ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
        "scale-in": "scaleIn 150ms ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
