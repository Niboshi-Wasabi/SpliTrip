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

function resolveMetadataUserId(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  const metadataUserId =
    typeof metadata?.user_id === "string" ? metadata.user_id : null;
  if (!metadataUserId) {
    return null;
  }
  const normalizedUserId = metadataUserId.trim();
  return normalizedUserId.length > 0 ? normalizedUserId : null;
}

function normalizeStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (typeof customer === "string") {
    const normalizedCustomerId = customer.trim();
    return normalizedCustomerId.length > 0 ? normalizedCustomerId : null;
  }
  if (customer && typeof customer.id === "string") {
    const normalizedCustomerId = customer.id.trim();
    return normalizedCustomerId.length > 0 ? normalizedCustomerId : null;
  }
  return null;
}

async function resolveUserIdFromCustomerLink(
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("stripe_customer_user_links")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe resolveUserIdFromCustomerLink]:",
      error,
      { customerId },
    );
    return null;
  }

  const linkedUserId = typeof data?.user_id === "string" ? data.user_id : "";
  return linkedUserId.length > 0 ? linkedUserId : null;
}

async function persistCustomerUserLink(
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("stripe_customer_user_links")
    .upsert(
      {
        customer_id: customerId,
        user_id: userId,
      },
      { onConflict: "customer_id" },
    );

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe persistCustomerUserLink]:",
      error,
      { customerId, userId },
    );
    return false;
  }

  return true;
}

async function grantStripePremiumAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  // Avoid overwriting user-entered profile fields such as display_name.
  const { error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        premium_access: true,
        premium_access_source: "stripe",
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe grantStripePremiumAccess]:",
      error,
      { userId },
    );
    return false;
  }

  return true;
}

async function revokeStripePremiumAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      premium_access: false,
      premium_access_source: "none",
    })
    .eq("id", userId)
    .eq("premium_access_source", "stripe");

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe revokeStripePremiumAccess]:",
      error,
      { userId },
    );
    return false;
  }

  return true;
}

async function hasWebhookEventBeenProcessed(
  supabaseAdmin: ReturnType<typeof createClient>,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error(
      "[API/Action Error - POST /api/webhook/stripe hasWebhookEventBeenProcessed]:",
      error,
      { eventId },
    );
    return false;
  }

  return Boolean(data?.event_id);
}

async function markWebhookEventAsProcessed(
  supabaseAdmin: ReturnType<typeof createClient>,
  event: Stripe.Event,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  if (!error) {
    return true;
  }

  const duplicateCode = "23505";
  if (error.code === duplicateCode) {
    return true;
  }

  console.error(
    "[API/Action Error - POST /api/webhook/stripe markWebhookEventAsProcessed]:",
    error,
    { eventId: event.id, eventType: event.type },
  );
  return false;
}

function isPremiumRevocationStatus(status: Stripe.Subscription.Status): boolean {
  return status === "canceled" || status === "incomplete_expired" || status === "unpaid";
}

const HANDLED_EVENT_TYPES = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.deleted",
  "customer.subscription.updated",
]);

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

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  const alreadyProcessed = await hasWebhookEventBeenProcessed(supabaseAdmin, event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = resolveStripeUserId(session);
    if (!userId) {
      console.error("checkout.session.completed missing user id", {
        eventId: event.id,
        sessionId: session.id,
      });
      return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 });
    }

    const premiumUpdated = await grantStripePremiumAccess(supabaseAdmin, userId);
    if (!premiumUpdated) {
      return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
    }

    const customerId = normalizeStripeCustomerId(session.customer);
    if (customerId) {
      const linked = await persistCustomerUserLink(supabaseAdmin, customerId, userId);
      if (!linked) {
        return NextResponse.json({ ok: false, error: "customer_link_failed" }, { status: 500 });
      }
    }
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = normalizeStripeCustomerId(subscription.customer);
    const metadataUserId = resolveMetadataUserId(subscription.metadata);
    const linkedUserId = customerId
      ? await resolveUserIdFromCustomerLink(supabaseAdmin, customerId)
      : null;
    const userId = metadataUserId ?? linkedUserId;

    if (!userId) {
      console.error("subscription event missing user mapping", {
        eventId: event.id,
        eventType: event.type,
        customerId,
      });
      return NextResponse.json({ ok: false, error: "missing_user_mapping" }, { status: 500 });
    }

    if (event.type === "customer.subscription.deleted" || isPremiumRevocationStatus(subscription.status)) {
      const premiumRevoked = await revokeStripePremiumAccess(supabaseAdmin, userId);
      if (!premiumRevoked) {
        return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
      }
    } else {
      const premiumGranted = await grantStripePremiumAccess(supabaseAdmin, userId);
      if (!premiumGranted) {
        return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
      }
    }

    if (customerId) {
      const linked = await persistCustomerUserLink(supabaseAdmin, customerId, userId);
      if (!linked) {
        return NextResponse.json({ ok: false, error: "customer_link_failed" }, { status: 500 });
      }
    }
  }

  const eventMarked = await markWebhookEventAsProcessed(supabaseAdmin, event);
  if (!eventMarked) {
    return NextResponse.json({ ok: false, error: "event_persist_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
