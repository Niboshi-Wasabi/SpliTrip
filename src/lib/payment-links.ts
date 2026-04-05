/**
 * Build deep links for PayPal.me and Cash App from stored profile handles.
 */

import { formatAmountForPaymentUrl } from "@/lib/currency-payment-amount";
import { sanitizeCashAppCashtag, sanitizePaypalMeId } from "@/lib/payment-ids";

export function buildPaypalMePaymentUrl(
  paypalMeId: string | null | undefined,
  currencyCode: string,
  amount: number,
): string | null {
  const sanitizedId = sanitizePaypalMeId(paypalMeId ?? null);
  if (!sanitizedId) {
    return null;
  }
  const amountSegment = formatAmountForPaymentUrl(currencyCode, amount);
  return `https://www.paypal.com/paypalme/${encodeURIComponent(sanitizedId)}/${encodeURIComponent(amountSegment)}`;
}

/** Pattern: https://cash.app/$Cashtag/amount */
export function buildCashAppPaymentUrl(
  cashtag: string | null | undefined,
  currencyCode: string,
  amount: number,
): string | null {
  const sanitizedTag = sanitizeCashAppCashtag(cashtag ?? null);
  if (!sanitizedTag) {
    return null;
  }
  const amountSegment = formatAmountForPaymentUrl(currencyCode, amount);
  return `https://cash.app/$${encodeURIComponent(sanitizedTag)}/${encodeURIComponent(amountSegment)}`;
}

export function openPaymentInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
