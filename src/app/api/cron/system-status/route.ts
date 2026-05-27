import { NextRequest, NextResponse } from "next/server";
import { runSystemStatusHealthProbes } from "@/lib/system-status-probe";
import { SYSTEM_STATUS_SERVICE_KEYS } from "@/lib/system-status";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron から `Authorization: Bearer <CRON_SECRET>` で呼ぶ。
 * サービス状態を実測し `system_status` を更新する（`pinned_by_admin=true` の行はスキップ）。
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, message: "cron_not_configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  try {
    const probeResults = await runSystemStatusHealthProbes();
    const serviceClient = createServiceRoleClient();

    const { data: pinRows, error: pinReadError } = await serviceClient
      .from("system_status")
      .select("service_key, pinned_by_admin");

    if (pinReadError) {
      console.error("[API/Action Error - GET /api/cron/system-status pins]:", pinReadError);
      return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
    }

    const skippedServiceKeys: string[] = [];
    const pinnedKeySet = new Set<string>();
    for (const row of pinRows ?? []) {
      const serviceKeyValue = row.service_key;
      if (typeof serviceKeyValue !== "string") {
        continue;
      }
      if (row.pinned_by_admin === true) {
        pinnedKeySet.add(serviceKeyValue);
      }
    }

    let updatedRowCount = 0;
    for (const serviceKeyDefinition of SYSTEM_STATUS_SERVICE_KEYS) {
      if (pinnedKeySet.has(serviceKeyDefinition)) {
        skippedServiceKeys.push(serviceKeyDefinition);
        continue;
      }
      const nextOperationalStatus = probeResults[serviceKeyDefinition];
      const { error: upsertError } = await serviceClient
        .from("system_status")
        .upsert(
          {
            service_key: serviceKeyDefinition,
            status: nextOperationalStatus,
          },
          { onConflict: "service_key" },
        );
      if (upsertError) {
        console.error(
          "[API/Action Error - GET /api/cron/system-status upsert]:",
          serviceKeyDefinition,
          upsertError,
        );
        return NextResponse.json({ ok: false, message: "save_error" }, { status: 500 });
      }
      updatedRowCount += 1;
    }

    return NextResponse.json({
      ok: true,
      updated_count: updatedRowCount,
      skipped_pinned_services: skippedServiceKeys,
    });
  } catch (caughtError) {
    console.error("[API/Action Error - GET /api/cron/system-status]:", caughtError);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
}
