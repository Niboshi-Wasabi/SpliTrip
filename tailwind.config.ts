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
} satisfies Config;

export default config;
