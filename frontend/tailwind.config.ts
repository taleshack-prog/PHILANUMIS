/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Sistema de design PhilaNumis — obsidiana (fundo) + bronze (metal antigo, físico) +
        // circuit (verde-azulado elétrico, on-chain/futurista). Ver frontend/README.md § Design.
        background: "#0B0D10",
        surface: "#14171C",
        "surface-hover": "#1B1F26",
        border: "#262B33",
        "border-strong": "#3A404B",
        ink: "#EDE6D6",
        "ink-dim": "#9A9FA8",
        bronze: {
          DEFAULT: "#C08A4E",
          bright: "#E8B673",
        },
        circuit: {
          DEFAULT: "#46E0C4",
          dim: "#2A8A78",
        },
        danger: { DEFAULT: "#F2665E", bg: "#2A1614" },
        success: { DEFAULT: "#4ADE9C", bg: "#122019" },
        warning: { DEFAULT: "#E8B673", bg: "#241C10" },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
