import type { Config } from "tailwindcss";

/**
 * Tailwind entry for tooling; dark mode follows `class` on `html` (theme provider).
 * ツール用設定。ダークは `html` の `class`（テーマプロバイダ）に追従する。
 *
 * Note: Tailwind v4 also defines `dark` via `globals.css` (`@custom-variant`); this flag documents intent.
 * 補足: v4 では `globals.css` の `@custom-variant` も併用。ここは意図の明示と互換用。
 *
 * Print utilities (`print:hidden`, etc.) use `@custom-variant print` in `globals.css` (standard `@media print`).
 * 印刷用ユーティリティは `globals.css` の `@custom-variant print`（`@media print`）に基づく。
 */
const config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        lp: {
          navy: "#1A202C",
          mint: "#34D399",
          coral: "#FB923C",
          text: "#F8FAFC",
          muted: "#CBD5E1",
        },
      },
      fontFamily: {
        /**
         * 本文スタック。実体は `globals.css` の `--font-serif`（`data-ui-sans` ごと）。
         * ja は Noto Sans JP 優先、en は Source Serif 4 優先。
         */
        serif: [
          "var(--font-serif)",
          "var(--font-source-serif)",
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          '"Meiryo"',
          "serif",
        ],
        /** 明示的な UI ゴシック（`font-sans`）。body の既定は `font-serif`。 */
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
} satisfies Config;

export default config;
