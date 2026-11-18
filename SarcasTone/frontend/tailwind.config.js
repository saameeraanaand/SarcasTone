export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "monospace"] },
    colors: {
      bg: "rgb(var(--bg) / <alpha-value>)", surface: "rgb(var(--surface) / <alpha-value>)", line: "rgb(var(--line) / <alpha-value>)",
      ink: "rgb(var(--ink) / <alpha-value>)", mute: "rgb(var(--mute) / <alpha-value>)",
      violet: { DEFAULT: "#8b5cf6", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" }, cyan: { DEFAULT: "#22d3ee", 400: "#22d3ee", 500: "#06b6d4" },
    },
    keyframes: { drift: { "0%,100%": { transform: "translate3d(0,0,0) scale(1)" }, "50%": { transform: "translate3d(30px,-20px,0) scale(1.08)" } },
      shimmer: { "100%": { transform: "translateX(100%)" } } },
    animation: { drift: "drift 14s ease-in-out infinite", shimmer: "shimmer 1.6s infinite" },
  } },
  plugins: [],
};
