/**
 * Per-locale UI font stacks (sans + mono) for next-intl locales.
 * 全ロケールで Geist / Fira に近いニュートラルなサンセリフ系に寄せる。
 */
import type { AppLocale } from "@/i18n/routing";

export type UiSansStackId =
  | "latin"
  | "ja";

export type UiMonoStackId = "fira";

export function getUiSansStackId(locale: AppLocale): UiSansStackId {
  switch (locale) {
    case "ja":
      return "ja";
    case "en":
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
    case "ja":
    case "en":
      return "fira";
    default: {
      const exhaustiveCheck: never = locale;
      return exhaustiveCheck;
    }
  }
}

/** Extra Google font loaded per locale (`[locale]/layout` → `html` class). `ja` は Noto Sans JP。 */
export type LocaleGoogleSansVariable =
  | "none"
  | "notoJp";

export function getLocaleGoogleSansVariable(locale: AppLocale): LocaleGoogleSansVariable {
  switch (locale) {
    case "ja":
      return "notoJp";
    case "en":
      return "none";
    default: {
      const exhaustiveCheck: never = locale;
      return exhaustiveCheck;
    }
  }
}
