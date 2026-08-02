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
        ink: "var(--text-primary)",
        "ink-secondary": "var(--text-secondary)",
        "ink-muted": "var(--text-muted)",
        hairline: "var(--hairline)",
        rim: "var(--rim)",
        series: "var(--series-1)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      letterSpacing: {
        // Used by the small all-caps overlines that key the console layout.
        overline: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;
