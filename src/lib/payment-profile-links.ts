/**
 * Build and parse `user_profiles.payment_links` for settlement deep links.
 */

import type { PaymentLinkStored } from "@/lib/database.types";
import { sanitizeJapanPaymentLinkUrl } from "@/lib/payment-ids";

export function buildPaymentLinksPayload(params: {
  paypalMeId: string | null;
  cashAppCashtag: string | null;
  payPayLink: string | null;
  linePayLink: string | null;
}): PaymentLinkStored[] {
  const links: PaymentLinkStored[] = [];
  if (params.paypalMeId) {
    links.push({
      url: `https://www.paypal.com/paypalme/${encodeURIComponent(params.paypalMeId)}`,
    });
  }
  if (params.cashAppCashtag) {
    const tag = params.cashAppCashtag.replace(/^\$/, "");
    links.push({
      url: `https://cash.app/$${encodeURIComponent(tag)}`,
    });
  }
  if (params.payPayLink) {
    links.push({ url: params.payPayLink, label: "PayPay" });
  }
  if (params.linePayLink) {
    links.push({ url: params.linePayLink, label: "LINE Pay" });
  }
  return links;
}

function hostnameFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Extract PayPay / LINE Pay URLs previously saved in payment_links. */
export function extractJapanWalletLinksFromProfile(
  paymentLinks: unknown,
): { payPayLink: string; linePayLink: string } {
  let payPayLink = "";
  let linePayLink = "";
  if (!Array.isArray(paymentLinks)) {
    return { payPayLink, linePayLink };
  }
  for (const linkEntry of paymentLinks) {
    if (!linkEntry || typeof linkEntry !== "object") {
      continue;
    }
    const record = linkEntry as PaymentLinkStored;
    if (typeof record.url !== "string") {
      continue;
    }
    const hostLower = hostnameFromUrl(record.url);
    if (hostLower.includes("paypay") && !payPayLink) {
      payPayLink = record.url;
    }
    if (
      (hostLower.includes("line.me") || hostLower.includes("linepay")) &&
      !linePayLink
    ) {
      linePayLink = record.url;
    }
  }
  return { payPayLink, linePayLink };
}

export function normalizeJapanWalletLinkInput(
  raw: string,
): { value: string | null; invalid: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, invalid: false };
  }
  const sanitized = sanitizeJapanPaymentLinkUrl(trimmed);
  if (!sanitized) {
    return { value: null, invalid: true };
  }
  return { value: sanitized, invalid: false };
}
