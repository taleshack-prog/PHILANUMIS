/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Placeholder — a paleta definitiva fica para a passada de design visual
        // (ver frontend-design skill), este scaffold só define a estrutura.
        ink: "#1A1A1A",
        parchment: "#F7F3EA",
      },
    },
  },
  plugins: [],
};
