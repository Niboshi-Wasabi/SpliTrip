/**
 * Map BCP 47 tags (navigator.languages, Accept-Language, etc.) to a supported AppLocale.
 * BCP 47 タグ列をアプリ対応ロケールへ解決する。
 */
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { routing, type AppLocale } from "@/i18n/routing";

const sortedLocalesLongestFirst = [...routing.locales].sort(
  (firstLocale, secondLocale) => secondLocale.length - firstLocale.length,
);

export function negotiateAppLocaleFromLanguageTags(
  languageTags: readonly string[],
): AppLocale {
  const normalizedTags = languageTags
    .map((languageTag) => languageTag.trim())
    .filter((languageTag) => languageTag.length > 0);
  if (normalizedTags.length === 0) {
    return routing.defaultLocale;
  }
  try {
    const matched = matchLocale(
      [...normalizedTags],
      sortedLocalesLongestFirst,
      routing.defaultLocale,
    );
    return matched as AppLocale;
  } catch {
    return routing.defaultLocale;
  }
}

export function negotiateAppLocaleFromAcceptLanguageHeader(
  acceptLanguageHeaderValue: string | null,
): AppLocale {
  const trimmed =
    acceptLanguageHeaderValue && acceptLanguageHeaderValue.trim().length > 0
      ? acceptLanguageHeaderValue.trim()
      : "";
  try {
    const preferredLanguages = new Negotiator({
      headers: { "accept-language": trimmed.length > 0 ? trimmed : "en" },
    }).languages();
    return negotiateAppLocaleFromLanguageTags(preferredLanguages);
  } catch {
    return routing.defaultLocale;
  }
}
