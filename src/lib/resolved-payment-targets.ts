/**
 * Build settlement payment targets from stored URLs + legacy handles.
 * 送金ボタン用に `payment_links` と従来の PayPal / Cash ハンドルを統合する。
 *
 * Why centralize: favicon URL + label keys stay consistent with settlement UI.
 * 理由: ファビコン URL とラベルキーを精算 UI で一元化する。
 */

import type { GroupMemberRow } from "@/lib/group-queries";
import type { PaymentLinkStored } from "@/lib/database.types";
import {
  buildCashAppPaymentUrl,
  buildPaypalMePaymentUrl,
} from "@/lib/payment-links";

export type PaymentActionKind =
  | "paypal_builtin"
  | "cash_app_builtin"
  | "custom_url";

export type ResolvedPaymentTarget = {
  /** Final HTTPS URL opened in a new tab. */
  paymentUrl: string;
  /** Google favicon service URL (or empty to use Wallet fallback in UI). */
  faviconUrl: string;
  /** next-intl key under `Settlement` for the button label. */
  labelMessageKey:
    | "payWithPaypal"
    | "payWithCashApp"
    | "payWithPayPay"
    | "payWithLinePay"
    | "payWithVenmo"
    | "payWithGeneric";
  kind: PaymentActionKind;
};

/** Public favicon fetcher (Google-hosted); UI falls back to Wallet if image errors. */
const GOOGLE_FAVICON_TEMPLATE =
  "https://s2.googleusercontent.com/s2/favicons?domain={host}&sz=64";

function hostnameFromPaymentUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function buildFaviconUrlForHostname(hostname: string): string {
  return GOOGLE_FAVICON_TEMPLATE.replace("{host}", encodeURIComponent(hostname));
}

/**
 * Classify hostname into a user-facing label key (no vendor-specific variable names in code).
 * ドメインから表示ラベルキーを決める（コード上の識別子はベンダー名に依存しない）。
 */
export function settlementLabelKeyForHostname(hostname: string): ResolvedPaymentTarget["labelMessageKey"] {
  const hostLower = hostname.toLowerCase();
  if (hostLower.includes("paypal")) return "payWithPaypal";
  if (hostLower.includes("cash.app") || hostLower === "cash.app")
    return "payWithCashApp";
  if (hostLower.includes("paypay")) return "payWithPayPay";
  if (hostLower.includes("line.me") || hostLower.includes("linepay"))
    return "payWithLinePay";
  if (hostLower.includes("venmo")) return "payWithVenmo";
  return "payWithGeneric";
}

function pushIfDistinct(
  list: ResolvedPaymentTarget[],
  entry: ResolvedPaymentTarget,
): void {
  if (!list.some((existing) => existing.paymentUrl === entry.paymentUrl)) {
    list.push(entry);
  }
}

/**
 * Resolves zero or more payment actions for a settlement row (viewer pays `amount` to `recipient`).
 */
export function resolvePaymentTargetsForMember(
  recipient: GroupMemberRow,
  currencyCode: string,
  amount: number,
): ResolvedPaymentTarget[] {
  const results: ResolvedPaymentTarget[] = [];

  const paypalUrl = buildPaypalMePaymentUrl(
    recipient.paypal_me_id,
    currencyCode,
    amount,
  );
  if (paypalUrl) {
    const host = hostnameFromPaymentUrl(paypalUrl);
    pushIfDistinct(results, {
      paymentUrl: paypalUrl,
      faviconUrl: host ? buildFaviconUrlForHostname(host) : "",
      labelMessageKey: "payWithPaypal",
      kind: "paypal_builtin",
    });
  }

  const cashUrl = buildCashAppPaymentUrl(
    recipient.cash_app_cashtag,
    currencyCode,
    amount,
  );
  if (cashUrl) {
    const host = hostnameFromPaymentUrl(cashUrl);
    pushIfDistinct(results, {
      paymentUrl: cashUrl,
      faviconUrl: host ? buildFaviconUrlForHostname(host) : "",
      labelMessageKey: "payWithCashApp",
      kind: "cash_app_builtin",
    });
  }

  const rawLinks = recipient.payment_links;
  if (Array.isArray(rawLinks)) {
    for (const linkEntry of rawLinks) {
      const record = linkEntry as PaymentLinkStored;
      if (!record || typeof record.url !== "string") continue;
      let absoluteUrl = record.url.trim();
      if (!absoluteUrl.startsWith("http://") && !absoluteUrl.startsWith("https://")) {
        absoluteUrl = `https://${absoluteUrl}`;
      }
      let paymentUrl = absoluteUrl;
      try {
        const base = new URL(absoluteUrl);
        if (!base.search && amount > 0) {
          base.searchParams.set("amount", String(amount));
        }
        paymentUrl = base.toString();
      } catch {
        continue;
      }
      const host = hostnameFromPaymentUrl(paymentUrl);
      if (!host) continue;
      pushIfDistinct(results, {
        paymentUrl,
        faviconUrl: buildFaviconUrlForHostname(host),
        labelMessageKey: settlementLabelKeyForHostname(host),
        kind: "custom_url",
      });
    }
  }

  return results;
}
