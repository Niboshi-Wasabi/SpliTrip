import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { getSupabaseEnv } from "@/utils/supabase/env";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ userId: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isPremiumRevocationStatus(status: Stripe.Subscription.Status): boolean {
  return status === "canceled" || status === "incomplete_expired" || status === "unpaid";
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const baseResponse = NextResponse.json(
    { ok: false, message: "forbidden" },
    { status: 403 },
  );
  const userClient = createRouteHandlerSupabaseClient(request, baseResponse);
  if (!userClient) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }
  const { data: ownProfile, error: ownErr } = await userClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (ownErr || ownProfile?.is_admin !== true) {
    return baseResponse;
  }
  const stepUp = requireAdminStepUpOrJson(request, user.id);
  if (stepUp) {
    return stepUp;
  }

  const { userId: targetId } = await params;
  if (!isUuid(targetId)) {
    return NextResponse.json({ ok: false, message: "invalid_user_id" }, { status: 400 });
  }

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const env = getSupabaseEnv();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!stripeKey || !env || !serviceRoleKey) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const stripe = new Stripe(stripeKey);
  const admin = createSupabaseClient(env.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: link } = await admin
    .from("stripe_customer_user_links")
    .select("customer_id")
    .eq("user_id", targetId)
    .maybeSingle();
  const customerId =
    link && typeof (link as { customer_id?: string }).customer_id === "string"
      ? (link as { customer_id: string }).customer_id
      : null;
  if (!customerId) {
    return NextResponse.json({
      ok: false,
      message: "no_stripe_customer",
    });
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const hasActive = subs.data.some((s) => !isPremiumRevocationStatus(s.status));

  const { data: currentProfile, error: readErr } = await admin
    .from("user_profiles")
    .select("premium_access, premium_access_source")
    .eq("id", targetId)
    .maybeSingle();
  if (readErr) {
    console.error("[sync-stripe read profile]:", readErr);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const source = (() => {
    const s = (currentProfile as { premium_access_source?: string } | null)
      ?.premium_access_source;
    return typeof s === "string" ? s : "none";
  })();

  if (hasActive) {
    const { error: upErr } = await admin.from("user_profiles").upsert(
      {
        id: targetId,
        premium_access: true,
        premium_access_source: "stripe",
      },
      { onConflict: "id" },
    );
    if (upErr) {
      console.error("[sync-stripe grant]:", upErr);
      return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
    }
  } else {
    if (source === "manual") {
      return NextResponse.json({
        ok: true,
        skipped: "manual_premium_unchanged",
        hadActiveSubscription: false,
        subscriptionCount: subs.data.length,
      });
    }
    const { error: upErr } = await admin.from("user_profiles").upsert(
      {
        id: targetId,
        premium_access: false,
        premium_access_source: "none",
      },
      { onConflict: "id" },
    );
    if (upErr) {
      console.error("[sync-stripe revoke]:", upErr);
      return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
    }
  }

  await admin.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    target_user_id: targetId,
    action: "sync_stripe",
    details: {
      has_active: hasActive,
      subscription_count: subs.data.length,
    },
  });

  return NextResponse.json({
    ok: true,
    hadActiveSubscription: hasActive,
    subscriptionCount: subs.data.length,
  });
}
