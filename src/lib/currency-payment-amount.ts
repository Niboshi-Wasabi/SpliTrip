/**
 * Currency helpers for payment URLs and localized money display.
 */

/** ISO 4217 currencies commonly handled as zero-decimal in UI / URLs. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function isZeroDecimalCurrency(currencyCode: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.trim().toUpperCase());
}

/** String suitable for PayPal / Cash App path segments (e.g. JPY "500", USD "5.00"). */
export function formatAmountForPaymentUrl(
  currencyCode: string,
  amount: number,
): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "0";
  }
  const normalizedCode = currencyCode.trim().toUpperCase();
  if (isZeroDecimalCurrency(normalizedCode)) {
    return String(Math.round(amount));
  }
  const roundedToCents = Math.round(amount * 100) / 100;
  return roundedToCents.toFixed(2);
}

/**
 * Locale-formatted currency for dashboard copy.
 * ダッシュボード用の通貨表示（`locale` 省略時は ja-JP）。
 */
export function formatMoneyByCurrency(
  currencyCode: string,
  amount: number,
  locale: string = "ja-JP",
): string {
  const normalizedCode = currencyCode.trim().toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCode,
      maximumFractionDigits: isZeroDecimalCurrency(normalizedCode) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${normalizedCode} ${amount}`;
  }
}
