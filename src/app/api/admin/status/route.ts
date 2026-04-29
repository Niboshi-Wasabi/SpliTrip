import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  SYSTEM_STATUS_SERVICE_KEYS,
  parseSystemStatusPayload,
  sortSystemStatusRowsByKnownOrder,
  type SystemOperationalStatus,
  type SystemStatusServiceKey,
  type SystemStatusRow,
} from "@/lib/system-status";

function hasAllServiceKeys(
  updates: { service_key: SystemStatusServiceKey; status: SystemOperationalStatus }[],
): boolean {
  if (updates.length !== SYSTEM_STATUS_SERVICE_KEYS.length) {
    return false;
  }
  const keys = new Set(updates.map((entry) => entry.service_key));
  return SYSTEM_STATUS_SERVICE_KEYS.every((expectedKey) => keys.has(expectedKey));
}

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
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (adminProfile?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const block = requireAdminStepUpOrJson(request, user.id);
  if (block) {
    return block;
  }

  const { data, error } = await supabase
    .from("system_status")
    .select("service_key, status, updated_at")
    .order("service_key", { ascending: true });

  if (error) {
    console.error("[API/Action Error - GET /api/admin/status]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  const items = sortSystemStatusRowsByKnownOrder((data ?? []) as SystemStatusRow[]);
  return NextResponse.json({ ok: true, items });
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
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (adminProfile?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const block = requireAdminStepUpOrJson(request, user.id);
  if (block) {
    return block;
  }

  let body: { items?: unknown };
  try {
    body = (await request.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }

  const parsed = parseSystemStatusPayload(body.items);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  if (!hasAllServiceKeys(parsed.updates)) {
    return NextResponse.json({ ok: false, message: "incomplete_items" }, { status: 400 });
  }

  const beforeSnapshot: Record<string, string> = {};
  const { data: previousRows, error: previousError } = await supabase
    .from("system_status")
    .select("service_key, status");

  if (previousError) {
    console.error("[API/Action Error - PUT /api/admin/status read previous]:", previousError);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  for (const row of previousRows ?? []) {
    if (typeof row.service_key === "string" && typeof row.status === "string") {
      beforeSnapshot[row.service_key] = row.status;
    }
  }

  for (const updateItem of parsed.updates) {
    const { error: upsertError } = await supabase
      .from("system_status")
      .upsert(
        {
          service_key: updateItem.service_key,
          status: updateItem.status,
        },
        { onConflict: "service_key" },
      );
    if (upsertError) {
      console.error("[API/Action Error - PUT /api/admin/status upsert]:", upsertError);
      return NextResponse.json({ ok: false, message: "save_error" }, { status: 500 });
    }
  }

  const { data: refreshedRows, error: refreshError } = await supabase
    .from("system_status")
    .select("service_key, status, updated_at")
    .order("service_key", { ascending: true });

  if (refreshError) {
    console.error("[API/Action Error - PUT /api/admin/status refresh]:", refreshError);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  const afterSnapshot: Record<string, string> = {};
  for (const row of refreshedRows ?? []) {
    if (typeof row.service_key === "string" && typeof row.status === "string") {
      afterSnapshot[row.service_key] = row.status;
    }
  }

  try {
    const auditClient = createServiceRoleClient();
    await auditClient.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      target_user_id: null,
      action: "system_status_update",
      details: {
        before: beforeSnapshot,
        after: afterSnapshot,
      },
    });
  } catch (caughtError) {
    console.error("[API/Action Error - PUT /api/admin/status audit]:", caughtError);
  }

  return NextResponse.json({
    ok: true,
    items: sortSystemStatusRowsByKnownOrder((refreshedRows ?? []) as SystemStatusRow[]),
  });
}
