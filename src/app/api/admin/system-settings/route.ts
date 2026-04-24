import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { getSupabaseEnv } from "@/utils/supabase/env";

const ALLOWED_KEYS = new Set([
  "maintenance_mode",
  "maintenance_announcement",
  "promo_banner_config",
]);

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }
  const { data: p } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (p?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const block = requireAdminStepUpOrJson(request, user.id);
  if (block) {
    return block;
  }
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value, description")
    .in("key", [...ALLOWED_KEYS]);
  if (error) {
    console.error("[admin system-settings get]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }
  const { data: p } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (p?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const block = requireAdminStepUpOrJson(request, user.id);
  if (block) {
    return block;
  }

  type Item = { key: string; value: unknown };
  let body: { items?: Item[] };
  try {
    body = (await request.json()) as { items?: Item[] };
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, message: "no_items" }, { status: 400 });
  }

  const env = getSupabaseEnv();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env || !serviceRole) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const admin = createSupabaseClient(env.url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const item of items) {
    if (!item || typeof item.key !== "string" || !ALLOWED_KEYS.has(item.key)) {
      return NextResponse.json(
        { ok: false, message: "invalid_key", key: item?.key },
        { status: 400 },
      );
    }
  }

  for (const item of items) {
    const { error: upErr } = await supabase
      .from("system_settings")
      .upsert(
        { key: item.key, value: item.value as object },
        { onConflict: "key" },
      );
    if (upErr) {
      console.error("[admin system-settings upsert user]:", upErr);
      return NextResponse.json({ ok: false, message: "save_error" }, { status: 500 });
    }
  }

  await admin.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    target_user_id: null,
    action: "system_settings_update",
    details: { keys: items.map((i) => i.key) },
  });

  return NextResponse.json({ ok: true });
}
