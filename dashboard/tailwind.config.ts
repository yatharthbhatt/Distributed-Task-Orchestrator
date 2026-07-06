import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bridge design tokens (defined in globals.css) into Tailwind utilities.
        surface: "var(--surface)",
        page: "var(--page)",
        ink: "var(--text-primary)",
        "ink-secondary": "var(--text-secondary)",
        "ink-muted": "var(--text-muted)",
        hairline: "var(--border)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
