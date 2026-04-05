/**
 * Persist PayPal.me and Cash App handles on `user_profiles` for settlement deep links.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractDisplayName } from "@/lib/user-profile";
import { sanitizeCashAppCashtag, sanitizePaypalMeId } from "@/lib/payment-ids";
import { createClient } from "@/utils/supabase/server";

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

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const display_name =
    existing?.display_name?.trim() || extractDisplayName(user);
  const avatar_url = existing?.avatar_url ?? null;

  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      display_name,
      avatar_url,
      paypal_me_id,
      cash_app_cashtag,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("payment-methods PATCH:", error.message);
    const missingColumn = /column .* does not exist/i.test(error.message);
    if (missingColumn) {
      return NextResponse.json(
        { error: "schema_missing", message: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "save_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paypal_me_id,
    cash_app_cashtag,
  });
}
