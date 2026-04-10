/**
 * Locales whose primary script is Latin (incl. extended Latin such as Turkish).
 * Used for monospace stack (Fira / system) vs CJK / Arabic / Cyrillic / Devanagari UI.
 * 主にラテン文字で UI を表示するロケール（トルコ語など拡張ラテン含む）。
 */
import type { AppLocale } from "@/i18n/routing";

const latinScriptLocales: ReadonlySet<AppLocale> = new Set([
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "tr",
  "sw",
]);

export function localeUsesLatinScript(locale: string): boolean {
  return latinScriptLocales.has(locale as AppLocale);
}
