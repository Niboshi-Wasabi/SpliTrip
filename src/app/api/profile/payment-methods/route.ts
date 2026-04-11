/**
 * Persist PayPal.me and Cash App handles on `user_profiles` for settlement deep links.
 */

import { NextRequest, NextResponse } from "next/server";
import { sanitizeCashAppCashtag, sanitizePaypalMeId } from "@/lib/payment-ids";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

function buildPaymentLinksJson(
  paypalMeId: string | null,
  cashAppCashtag: string | null,
): unknown[] {
  const links: { url: string }[] = [];
  if (paypalMeId) {
    links.push({
      url: `https://www.paypal.com/paypalme/${encodeURIComponent(paypalMeId)}`,
    });
  }
  if (cashAppCashtag) {
    const tag = cashAppCashtag.replace(/^\$/, "");
    links.push({
      url: `https://cash.app/$${encodeURIComponent(tag)}`,
    });
  }
  return links;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as {
    paypal_me_id?: unknown;
    cash_app_cashtag?: unknown;
  };

  const paypalRaw =
    body.paypal_me_id === null || body.paypal_me_id === undefined
      ? ""
      : String(body.paypal_me_id);
  const cashRaw =
    body.cash_app_cashtag === null || body.cash_app_cashtag === undefined
      ? ""
      : String(body.cash_app_cashtag);

  const paypal_me_id = paypalRaw.trim() === "" ? null : sanitizePaypalMeId(paypalRaw);
  const cash_app_cashtag =
    cashRaw.trim() === "" ? null : sanitizeCashAppCashtag(cashRaw);

  if (paypalRaw.trim() !== "" && paypal_me_id === null) {
    return NextResponse.json({ error: "invalid_paypal_me_id" }, { status: 400 });
  }
  if (cashRaw.trim() !== "" && cash_app_cashtag === null) {
    return NextResponse.json({ error: "invalid_cash_app_cashtag" }, { status: 400 });
  }

  const paymentLinksPayload = buildPaymentLinksJson(paypal_me_id, cash_app_cashtag);

  const { error } = await supabase.rpc("update_own_payment_methods", {
    p_paypal_me_id: paypal_me_id,
    p_cash_app_cashtag: cash_app_cashtag,
    p_payment_links: paymentLinksPayload,
  });

  if (error) {
    console.error("[API/Action Error - PATCH /api/profile/payment-methods]:", error);
    return NextResponse.json(
      { error: "save_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paypal_me_id,
    cash_app_cashtag,
  });
}
