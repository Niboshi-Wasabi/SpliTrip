/**
 * Sanitize third-party payment handles pasted from URLs or with extra symbols.
 */

/** Keep only the PayPal.me username segment (alphanumeric + hyphen). */
export function sanitizePaypalMeId(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  let normalized = raw.trim();
  if (!normalized) {
    return null;
  }
  const lowercased = normalized.toLowerCase();
  if (lowercased.includes("paypal.com") || lowercased.includes("paypal.me")) {
    const pathMatch = normalized.match(/paypal\.me\/([^/?#]+)/i);
    if (pathMatch?.[1]) {
      normalized = decodeURIComponent(pathMatch[1]);
    }
  }
  normalized = normalized.replace(/^@+/, "").trim();
  if (
    !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,98}[a-zA-Z0-9])?$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

/** Strip leading `$` and optional cash.app URL wrapper from a Cashtag. */
export function sanitizeCashAppCashtag(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  let normalized = raw.trim().replace(/^\$+/, "").trim();
  if (!normalized) {
    return null;
  }
  const lowercased = normalized.toLowerCase();
  if (lowercased.includes("cash.app")) {
    const pathMatch = normalized.match(/cash\.app\/\$?([^/?#]+)/i);
    if (pathMatch?.[1]) {
      normalized = decodeURIComponent(pathMatch[1]);
    }
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

/** Accept HTTPS payment deep links for Japan-focused wallets (PayPay / LINE Pay). */
export function sanitizeJapanPaymentLinkUrl(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  let normalized = raw.trim();
  if (!normalized) {
    return null;
  }
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  try {
    const parsedUrl = new URL(normalized);
    if (parsedUrl.protocol !== "https:") {
      return null;
    }
    const hostLower = parsedUrl.hostname.toLowerCase();
    const isPayPay = hostLower.includes("paypay");
    const isLinePay =
      hostLower.includes("line.me") || hostLower.includes("linepay");
    if (!isPayPay && !isLinePay) {
      return null;
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}
