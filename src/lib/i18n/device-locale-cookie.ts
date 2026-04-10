/**
 * Client-set cookie carrying `navigator.languages` for edge locale negotiation.
 * ミドルウェアが Referer 後続リクエストでデバイス優先度を足すための Cookie。
 */

export const SPLITRIP_DEVICE_LANGUAGE_TAGS_COOKIE_NAME = "SPLITRIP_DEVICE_LANGS";

const safeBcp47TagPattern = /^[A-Za-z0-9-]+$/;

export function parseDeviceLanguageTagsFromCookieValue(
  rawValue: string | undefined,
): string[] {
  if (!rawValue || rawValue.trim().length === 0) {
    return [];
  }
  try {
    const decoded = decodeURIComponent(rawValue);
    return decoded
      .split(",")
      .map((segment) => segment.trim())
      .filter(
        (segment) =>
          segment.length > 0 && safeBcp47TagPattern.test(segment),
      );
  } catch {
    return [];
  }
}

export function buildDeviceLanguageTagsCookieValue(
  languageTags: readonly string[],
): string {
  const sanitized = languageTags
    .map((tag) => tag.trim())
    .filter(
      (tag) => tag.length > 0 && safeBcp47TagPattern.test(tag),
    );
  return encodeURIComponent(sanitized.join(","));
}
