import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sc: {
          bg: "#15131C",
          panel: "#1E1B29",
          panel2: "#262232",
          line: "#352F45",
          ink: "#F3EFE9",
          sub: "#9A93AD",
          faint: "#6A6480",
          coral: "#FF5A5F",
          "coral-deep": "#D43F45",
          amber: "#F7A23B",
          gold: "#E7B45A",
          aqua: "#37C8A0",
          violet: "#9B7BE8",
          blue: "#5AA9FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "70%": { transform: "scale(2.4)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        "slide-in": "slideIn 0.35s ease",
        blink: "blink 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
