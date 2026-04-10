/**
 * First-visit locale hint: combine Accept-Language with edge geo (Vercel / Cloudflare)
 * so English-only browser headers do not always win over the access region.
 * 初回: Accept-Language だけだと en 固定になりがちなので、接続元の国コードで補正する。
 */
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextRequest } from "next/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { NEXT_INTL_LOCALE_COOKIE_NAME } from "@/lib/i18n/next-intl-locale";

const sortedLocalesLongestFirst = [...routing.locales].sort(
  (firstLocale, secondLocale) => secondLocale.length - firstLocale.length,
);

/** ISO 3166-1 alpha-2 → primary UI locale for that region (conservative list). */
const COUNTRY_PRIMARY_LOCALE: Partial<Record<string, AppLocale>> = {
  JP: "ja",
  KR: "ko",
  CN: "zh-CN",
  TW: "zh-TW",
  HK: "zh-TW",
  MO: "zh-TW",
  DE: "de",
  AT: "de",
  FR: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  BR: "pt",
  PT: "pt",
  RU: "ru",
  TR: "tr",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  IN: "hi",
  NP: "hi",
  KE: "sw",
  TZ: "sw",
};

function readCountryCode(headers: Headers): string | undefined {
  const vercelCountry = headers.get("x-vercel-ip-country")?.trim();
  if (vercelCountry) {
    return vercelCountry.toUpperCase();
  }
  const cloudflareCountry = headers.get("cf-ipcountry")?.trim();
  if (cloudflareCountry && cloudflareCountry.toUpperCase() !== "XX") {
    return cloudflareCountry.toUpperCase();
  }
  return undefined;
}

function localeFromAcceptLanguageHeader(
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
    const matched = matchLocale(
      preferredLanguages,
      sortedLocalesLongestFirst,
      routing.defaultLocale,
    );
    return matched as AppLocale;
  } catch {
    return routing.defaultLocale;
  }
}

/**
 * Exported for unit tests / 単体テスト用に公開。
 */
export function inferPreferredLocaleForAccess(input: {
  acceptLanguageHeader: string | null;
  countryCode: string | undefined;
}): AppLocale {
  const acceptLanguageHeaderEmpty =
    !input.acceptLanguageHeader ||
    input.acceptLanguageHeader.trim().length === 0;

  const fromAccept = localeFromAcceptLanguageHeader(input.acceptLanguageHeader);
  const countryUpper = input.countryCode?.toUpperCase();
  const fromGeo = countryUpper
    ? COUNTRY_PRIMARY_LOCALE[countryUpper]
    : undefined;

  if (acceptLanguageHeaderEmpty && fromGeo) {
    return fromGeo;
  }

  if (fromAccept === "en" && fromGeo && fromGeo !== "en") {
    return fromGeo;
  }

  return fromAccept;
}

function acceptLanguagePrimaryTag(locale: AppLocale): string {
  if (locale === "ja") {
    return "ja-JP,ja";
  }
  if (locale === "zh-CN") {
    return "zh-CN,zh";
  }
  if (locale === "zh-TW") {
    return "zh-TW,zh";
  }
  return locale;
}

/**
 * When the persisted locale cookie is absent, rewrite Accept-Language so next-intl
 * negotiates the same locale as {@link inferPreferredLocaleForAccess}.
 * Cookie 未設定時のみ Accept-Language を補い、next-intl の交渉結果を揃える。
 */
export function applyAccessBasedLocaleHint(request: NextRequest): NextRequest {
  if (request.cookies.has(NEXT_INTL_LOCALE_COOKIE_NAME)) {
    return request;
  }

  const acceptHeader = request.headers.get("accept-language");
  const fromAccept = localeFromAcceptLanguageHeader(acceptHeader);
  const inferred = inferPreferredLocaleForAccess({
    acceptLanguageHeader: acceptHeader,
    countryCode: readCountryCode(request.headers),
  });

  if (inferred === fromAccept) {
    return request;
  }

  const headers = new Headers(request.headers);
  const primaryTag = acceptLanguagePrimaryTag(inferred);
  const existing = acceptHeader?.trim() ?? "";
  headers.set(
    "accept-language",
    existing.length > 0
      ? `${primaryTag},${existing}`
      : `${primaryTag},en;q=0.01`,
  );

  return new NextRequest(request.url, { headers, method: request.method });
}
