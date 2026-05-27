import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  SYSTEM_STATUS_SERVICE_KEYS,
  parseSystemStatusPayload,
  sortSystemStatusRowsByKnownOrder,
  type SystemOperationalStatus,
  type SystemStatusAdminRow,
  type SystemStatusServiceKey,
  type SystemStatusUpdatePayloadItem,
} from "@/lib/system-status";

function hasAllServiceKeys(
  updates: readonly SystemStatusUpdatePayloadItem[],
): boolean {
  if (updates.length !== SYSTEM_STATUS_SERVICE_KEYS.length) {
    return false;
  }
  const keys = new Set(updates.map((entry) => entry.service_key));
  return SYSTEM_STATUS_SERVICE_KEYS.every((expectedKey) => keys.has(expectedKey));
}

function mapRowsToAdminPayload(
  rowsInput: readonly Record<string, unknown>[] | null | undefined,
): SystemStatusAdminRow[] {
  const allowedStatuses = [
    "operational",
    "degraded",
    "partial_outage",
    "major_outage",
  ] as const satisfies readonly SystemOperationalStatus[];

  const adminRows: SystemStatusAdminRow[] = [];
  for (const rawCandidate of rowsInput ?? []) {
    const record = rawCandidate as Record<string, unknown>;
    const serviceKeyCandidate = record.service_key;
    const statusCandidate = record.status;
    if (typeof serviceKeyCandidate !== "string" || typeof statusCandidate !== "string") {
      continue;
    }
    if (
      !SYSTEM_STATUS_SERVICE_KEYS.includes(
        serviceKeyCandidate as SystemStatusServiceKey,
      )
    ) {
      continue;
    }
    if (!(allowedStatuses as readonly string[]).includes(statusCandidate)) {
      continue;
    }
    const pinRaw = record.pinned_by_admin;
    adminRows.push({
      service_key: serviceKeyCandidate as SystemStatusServiceKey,
      status: statusCandidate as SystemOperationalStatus,
      updated_at: String(record.updated_at ?? ""),
      pinned_by_admin: pinRaw === true,
    });
  }
  return sortSystemStatusRowsByKnownOrder(
    adminRows,
  ) as SystemStatusAdminRow[];
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
    .select("service_key, status, updated_at, pinned_by_admin")
    .order("service_key", { ascending: true });

  if (error) {
    console.error("[API/Action Error - GET /api/admin/status]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  const items = mapRowsToAdminPayload(
    (data ?? []) as Record<string, unknown>[],
  );

  return NextResponse.json({
    ok: true,
    items,
  });
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

  const beforeStatuses: Record<string, string> = {};
  const beforePins: Record<string, boolean> = {};
  const pinnedByKeyFromDatabase = new Map<SystemStatusServiceKey, boolean>();
  const { data: previousRows, error: previousError } = await supabase
    .from("system_status")
    .select("service_key, status, pinned_by_admin");

  if (previousError) {
    console.error("[API/Action Error - PUT /api/admin/status read previous]:", previousError);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  for (const row of previousRows ?? []) {
    if (typeof row.service_key !== "string" || typeof row.status !== "string") {
      continue;
    }
    beforeStatuses[row.service_key] = row.status;
    const previousPin = row.pinned_by_admin === true;
    beforePins[row.service_key] = previousPin;
    if (
      SYSTEM_STATUS_SERVICE_KEYS.includes(row.service_key as SystemStatusServiceKey)
    ) {
      pinnedByKeyFromDatabase.set(
        row.service_key as SystemStatusServiceKey,
        previousPin,
      );
    }
  }

  for (const updateItem of parsed.updates) {
    const nextPin =
      updateItem.pinned_by_admin ??
      pinnedByKeyFromDatabase.get(updateItem.service_key) ??
      false;
    const { error: upsertError } = await supabase.from("system_status").upsert(
      {
        service_key: updateItem.service_key,
        status: updateItem.status,
        pinned_by_admin: nextPin,
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
    .select("service_key, status, updated_at, pinned_by_admin")
    .order("service_key", { ascending: true });

  if (refreshError) {
    console.error("[API/Action Error - PUT /api/admin/status refresh]:", refreshError);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  const afterStatuses: Record<string, string> = {};
  const afterPins: Record<string, boolean> = {};
  for (const row of refreshedRows ?? []) {
    if (typeof row.service_key === "string" && typeof row.status === "string") {
      afterStatuses[row.service_key] = row.status;
      afterPins[row.service_key] = row.pinned_by_admin === true;
    }
  }

  try {
    const auditClient = createServiceRoleClient();
    await auditClient.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      target_user_id: null,
      action: "system_status_update",
      details: {
        statuses_before: beforeStatuses,
        statuses_after: afterStatuses,
        pinned_before: beforePins,
        pinned_after: afterPins,
      },
    });
  } catch (caughtError) {
    console.error("[API/Action Error - PUT /api/admin/status audit]:", caughtError);
  }

  const responseItems = mapRowsToAdminPayload(
    (refreshedRows ?? []) as Record<string, unknown>[],
  );

  return NextResponse.json({
    ok: true,
    items: responseItems,
  });
}
