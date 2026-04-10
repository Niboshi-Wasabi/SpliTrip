import type { AppLocale } from "@/i18n/routing";

/** Fixed labels for the language picker (native names). / 言語ピッカー用の固定ラベル */
export const LOCALE_DISPLAY_OPTIONS: { locale: AppLocale; label: string }[] = [
  { locale: "ja", label: "日本語" },
  { locale: "en", label: "English" },
  { locale: "zh-CN", label: "简体中文" },
  { locale: "zh-TW", label: "繁體中文" },
  { locale: "ko", label: "한국어" },
  { locale: "es", label: "Español" },
  { locale: "fr", label: "Français" },
  { locale: "de", label: "Deutsch" },
  { locale: "pt", label: "Português" },
  { locale: "ru", label: "Русский" },
  { locale: "tr", label: "Türkçe" },
  { locale: "ar", label: "العربية" },
  { locale: "sw", label: "Kiswahili" },
  { locale: "hi", label: "हिन्दी" },
];
