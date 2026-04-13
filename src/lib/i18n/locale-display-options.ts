import type { AppLocale } from "@/i18n/routing";

/** Fixed labels for the language picker (native names). / 言語ピッカー用の固定ラベル */
export const LOCALE_DISPLAY_OPTIONS: { locale: AppLocale; label: string }[] = [
  { locale: "ja", label: "日本語" },
  { locale: "en", label: "English" },
];
