import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        text: "hsl(var(--text))",
        muted: "hsl(var(--muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          fg: "hsl(var(--primary-fg))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          fg: "hsl(var(--success-fg))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          fg: "hsl(var(--accent-fg))"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)"
      },
      boxShadow: {
        "elev-1": "var(--shadow-1)",
        "elev-2": "var(--shadow-2)"
      }
    }
  },
  plugins: []
} satisfies Config;

