/**
 * Per-locale UI font stacks (sans + mono) for next-intl locales.
 * 全ロケールで Geist / Fira に近いニュートラルなサンセリフ系に寄せる。
 */
import type { AppLocale } from "@/i18n/routing";

export type UiSansStackId =
  | "latin"
  | "ja"
  | "zh-cn"
  | "zh-tw"
  | "ko"
  | "ru"
  | "ar"
  | "hi";

export type UiMonoStackId = "fira" | "cjk" | "arabic" | "devanagari";

export function getUiSansStackId(locale: AppLocale): UiSansStackId {
  switch (locale) {
    case "ja":
      return "ja";
    case "zh-CN":
      return "zh-cn";
    case "zh-TW":
      return "zh-tw";
    case "ko":
      return "ko";
    case "ru":
      return "ru";
    case "ar":
      return "ar";
    case "hi":
      return "hi";
    case "en":
    case "es":
    case "fr":
    case "de":
    case "pt":
    case "tr":
    case "sw":
      return "latin";
    default: {
      const exhaustiveCheck: never = locale;
      return exhaustiveCheck;
    }
  }
}

/**
 * Fira Code はラテン・キリルに対応するため ru も fira。
 * CJK / アラビア語 / デーヴァナーガリーは専用の等幅スタック。
 */
export function getUiMonoStackId(locale: AppLocale): UiMonoStackId {
  switch (locale) {
    case "en":
    case "es":
    case "fr":
    case "de":
    case "pt":
    case "tr":
    case "sw":
    case "ru":
      return "fira";
    case "ar":
      return "arabic";
    case "hi":
      return "devanagari";
    case "ja":
    case "zh-CN":
    case "zh-TW":
    case "ko":
      return "cjk";
    default: {
      const exhaustiveCheck: never = locale;
      return exhaustiveCheck;
    }
  }
}

/** Extra Google font loaded per locale (`[locale]/layout` → `html` class). `ja` は Noto Serif JP。 */
export type LocaleGoogleSansVariable =
  | "none"
  | "notoJp"
  | "notoSc"
  | "notoTc"
  | "notoKr"
  | "notoCyrillic"
  | "notoArabic"
  | "notoDevanagari";

export function getLocaleGoogleSansVariable(locale: AppLocale): LocaleGoogleSansVariable {
  switch (locale) {
    case "ja":
      return "notoJp";
    case "zh-CN":
      return "notoSc";
    case "zh-TW":
      return "notoTc";
    case "ko":
      return "notoKr";
    case "ru":
      return "notoCyrillic";
    case "ar":
      return "notoArabic";
    case "hi":
      return "notoDevanagari";
    case "en":
    case "es":
    case "fr":
    case "de":
    case "pt":
    case "tr":
    case "sw":
      return "none";
    default: {
      const exhaustiveCheck: never = locale;
      return exhaustiveCheck;
    }
  }
}
