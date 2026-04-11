import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getStripeEnv() {
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (
    !stripeSecretKey ||
    !stripeWebhookSecret ||
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    return null;
  }
  return {
    stripeSecretKey,
    stripeWebhookSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
  };
}

function resolveStripeUserId(session: Stripe.Checkout.Session): string | null {
  const candidateUserId =
    session.client_reference_id ??
    (typeof session.metadata?.user_id === "string" ? session.metadata.user_id : null);
  if (!candidateUserId) {
    return null;
  }
  const normalizedUserId = candidateUserId.trim();
  return normalizedUserId.length > 0 ? normalizedUserId : null;
}

export async function POST(request: Request) {
  const env = getStripeEnv();
  if (!env) {
    console.error("Stripe webhook env is missing");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const stripe = new Stripe(env.stripeSecretKey);
  const requestBody = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      requestBody,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe signature verification]:",
      error,
    );
    return NextResponse.json({ ok: false, error: "signature_verification_failed" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = resolveStripeUserId(session);
  if (!userId) {
    console.error("checkout.session.completed missing user id", {
      eventId: event.id,
      sessionId: session.id,
    });
    return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 });
  }

  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        display_name: "ユーザー",
        premium_access: true,
        premium_access_source: "stripe",
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe user_profiles update]:",
      error,
      {
        userId,
        eventId: event.id,
      },
    );
    return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
