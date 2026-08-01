import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sc: {
          bg: "#0D1717",
          panel: "#152222",
          panel2: "#1A2C2C",
          line: "#1F3333",
          ink: "#E8F0EF",
          sub: "#8FA8A7",
          faint: "#5A7574",
          coral: "#F87171",
          "coral-deep": "#DC2626",
          amber: "#FBBF24",
          gold: "#E7B45A",
          aqua: "#5BB5B0",
          violet: "#5BB5B0",
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
