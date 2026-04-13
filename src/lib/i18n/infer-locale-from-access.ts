/**
 * First-visit locale hint: combine Accept-Language with edge geo (Vercel / Cloudflare)
 * and optional device language tags (SPLITRIP_DEVICE_LANGS from navigator.languages).
 * 初回: Accept-Language に加え、国コードと（あれば）デバイス優先タグで補正する。
 */
import Negotiator from "negotiator";
import { NextRequest } from "next/server";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  SPLITRIP_DEVICE_LANGUAGE_TAGS_COOKIE_NAME,
  parseDeviceLanguageTagsFromCookieValue,
} from "@/lib/i18n/device-locale-cookie";
import {
  negotiateAppLocaleFromLanguageTags,
} from "@/lib/i18n/negotiate-app-locale";
import { NEXT_INTL_LOCALE_COOKIE_NAME } from "@/lib/i18n/next-intl-locale";

/** ISO 3166-1 alpha-2 → primary UI locale for that region (conservative list). */
const COUNTRY_PRIMARY_LOCALE: Partial<Record<string, AppLocale>> = {
  JP: "ja",
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

function acceptLanguageMentionsJapanese(
  acceptLanguageHeaderValue: string | null,
): boolean {
  if (
    !acceptLanguageHeaderValue ||
    acceptLanguageHeaderValue.trim().length === 0
  ) {
    return false;
  }
  try {
    const preferredLanguages = new Negotiator({
      headers: {
        "accept-language": acceptLanguageHeaderValue.trim(),
      },
    }).languages();
    return preferredLanguages.some(
      (languageTag) =>
        languageTag === "ja" || languageTag.toLowerCase().startsWith("ja-"),
    );
  } catch {
    return false;
  }
}

function negotiateAppLocaleFromAcceptLanguageHeader(
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

/**
 * Build a synthetic Accept-Language–like list: device tags first, then header.
 * デバイス優先でタグを先頭に並べ、HTTP ヘッダを続ける。
 */
export function mergeDeviceLanguageTagsBeforeAcceptHeader(
  deviceLanguageTags: readonly string[],
  acceptLanguageHeaderValue: string | null,
): string | null {
  if (deviceLanguageTags.length === 0) {
    return acceptLanguageHeaderValue;
  }
  const headerTrimmed = acceptLanguageHeaderValue?.trim() ?? "";
  const tail = headerTrimmed.length > 0 ? headerTrimmed : "en;q=0.01";
  return `${deviceLanguageTags.join(",")},${tail}`;
}

/**
 * Exported for unit tests / 単体テスト用に公開。
 */
export function inferPreferredLocaleForAccess(input: {
  acceptLanguageHeader: string | null;
  countryCode: string | undefined;
  deviceLanguageTags?: readonly string[];
}): AppLocale {
  const deviceTags = input.deviceLanguageTags ?? [];
  const effectiveAcceptHeader = mergeDeviceLanguageTagsBeforeAcceptHeader(
    deviceTags,
    input.acceptLanguageHeader,
  );

  const fromMergedAccept =
    negotiateAppLocaleFromAcceptLanguageHeader(effectiveAcceptHeader);

  const acceptLanguageHeaderEmpty =
    !input.acceptLanguageHeader ||
    input.acceptLanguageHeader.trim().length === 0;

  const countryUpper = input.countryCode?.toUpperCase();
  const fromGeo = countryUpper
    ? COUNTRY_PRIMARY_LOCALE[countryUpper]
    : undefined;

  if (acceptLanguageHeaderEmpty && fromGeo) {
    if (deviceTags.length > 0) {
      return negotiateAppLocaleFromLanguageTags(deviceTags);
    }
    return fromGeo;
  }

  if (fromMergedAccept === "en" && fromGeo && fromGeo !== "en") {
    return fromGeo;
  }

  /*
   * Japan: 合成ヘッダに ja が含まれない限り JP からは日本語を優先（誤設定ヘッダ対策）。
   * デバイスが ja を先頭に載せていれば effective 側で解決済み。
   */
  if (
    countryUpper === "JP" &&
    fromGeo === "ja" &&
    !acceptLanguageMentionsJapanese(effectiveAcceptHeader) &&
    fromMergedAccept !== "ja"
  ) {
    return "ja";
  }

  return fromMergedAccept;
}

function acceptLanguagePrimaryTag(locale: AppLocale): string {
  if (locale === "ja") {
    return "ja-JP,ja";
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
  const deviceTags = parseDeviceLanguageTagsFromCookieValue(
    request.cookies.get(SPLITRIP_DEVICE_LANGUAGE_TAGS_COOKIE_NAME)?.value,
  );
  const effectiveAcceptHeader = mergeDeviceLanguageTagsBeforeAcceptHeader(
    deviceTags,
    acceptHeader,
  );

  const rawNegotiatedLocale =
    negotiateAppLocaleFromAcceptLanguageHeader(acceptHeader);
  const fromAcceptWithoutInferenceRules =
    deviceTags.length > 0 && !acceptHeader?.trim()
      ? routing.defaultLocale
      : rawNegotiatedLocale;
  const inferred = inferPreferredLocaleForAccess({
    acceptLanguageHeader: acceptHeader,
    countryCode: readCountryCode(request.headers),
    deviceLanguageTags: deviceTags,
  });

  if (inferred === fromAcceptWithoutInferenceRules) {
    return request;
  }

  const headers = new Headers(request.headers);
  const primaryTag = acceptLanguagePrimaryTag(inferred);
  const existing = effectiveAcceptHeader?.trim() ?? "";
  headers.set(
    "accept-language",
    existing.length > 0
      ? `${primaryTag},${existing}`
      : `${primaryTag},en;q=0.01`,
  );

  return new NextRequest(request.url, { headers, method: request.method });
}
