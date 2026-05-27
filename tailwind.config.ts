import type { Config } from "tailwindcss";
import { heroui } from "@heroui/theme";
import typography from "@tailwindcss/typography";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-noto-sans-jp)", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        heading: ["var(--font-heading)", "var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [
    typography,
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#0066cc",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#059669",
              foreground: "#ecfdf5",
            },
            danger: {
              DEFAULT: "#e11d48",
              foreground: "#fff1f2",
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#2997ff",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#10b981",
              foreground: "#ecfdf5",
            },
            danger: {
              DEFAULT: "#f43f5e",
              foreground: "#fff1f2",
            },
          },
        },
      },
    }),
  ],
} satisfies Config;

export default config;
