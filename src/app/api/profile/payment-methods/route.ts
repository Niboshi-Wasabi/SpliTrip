/**
 * Persist PayPal.me, Cash App, PayPay, and LINE Pay links on `user_profiles`.
 */

import { NextRequest, NextResponse } from "next/server";
import { sanitizeCashAppCashtag, sanitizePaypalMeId } from "@/lib/payment-ids";
import {
  buildPaymentLinksPayload,
  normalizeJapanWalletLinkInput,
} from "@/lib/payment-profile-links";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }

  const body = parsed as {
    paypal_me_id?: unknown;
    cash_app_cashtag?: unknown;
    paypay_link?: unknown;
    line_pay_link?: unknown;
  };

  const paypalRaw =
    body.paypal_me_id === null || body.paypal_me_id === undefined
      ? ""
      : String(body.paypal_me_id);
  const cashRaw =
    body.cash_app_cashtag === null || body.cash_app_cashtag === undefined
      ? ""
      : String(body.cash_app_cashtag);
  const payPayRaw =
    body.paypay_link === null || body.paypay_link === undefined
      ? ""
      : String(body.paypay_link);
  const linePayRaw =
    body.line_pay_link === null || body.line_pay_link === undefined
      ? ""
      : String(body.line_pay_link);

  const paypal_me_id = paypalRaw.trim() === "" ? null : sanitizePaypalMeId(paypalRaw);
  const cash_app_cashtag =
    cashRaw.trim() === "" ? null : sanitizeCashAppCashtag(cashRaw);

  if (paypalRaw.trim() !== "" && paypal_me_id === null) {
    return NextResponse.json({ ok: false, message: "invalid_paypal_me_id" }, { status: 400 });
  }
  if (cashRaw.trim() !== "" && cash_app_cashtag === null) {
    return NextResponse.json({ ok: false, message: "invalid_cash_app_cashtag" }, { status: 400 });
  }

  const payPayNormalized = normalizeJapanWalletLinkInput(payPayRaw);
  if (payPayNormalized.invalid) {
    return NextResponse.json({ ok: false, message: "invalid_paypay_link" }, { status: 400 });
  }

  const linePayNormalized = normalizeJapanWalletLinkInput(linePayRaw);
  if (linePayNormalized.invalid) {
    return NextResponse.json({ ok: false, message: "invalid_line_pay_link" }, { status: 400 });
  }

  const paymentLinksPayload = buildPaymentLinksPayload({
    paypalMeId: paypal_me_id,
    cashAppCashtag: cash_app_cashtag,
    payPayLink: payPayNormalized.value,
    linePayLink: linePayNormalized.value,
  });

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
    paypay_link: payPayNormalized.value,
    line_pay_link: linePayNormalized.value,
  });
}
