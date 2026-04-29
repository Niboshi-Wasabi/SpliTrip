import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import type { MaintenanceScheduleRow } from "@/lib/maintenance-schedule";

type MaintenanceUpdateBody = {
  id?: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  announcement_message_ja: string;
  announcement_message_en: string;
};

async function requireAdmin(
  request: NextRequest,
  response: NextResponse,
): Promise<
  | { ok: true; supabase: NonNullable<ReturnType<typeof createRouteHandlerSupabaseClient>> }
  | { ok: false; response: NextResponse }
> {
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "server_error" },
        { status: 500 },
      ),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "unauthorized" },
        { status: 401 },
      ),
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin !== true) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "forbidden" },
        { status: 403 },
      ),
    };
  }

  const stepUpBlock = requireAdminStepUpOrJson(request, user.id);
  if (stepUpBlock) {
    return { ok: false, response: stepUpBlock };
  }

  return { ok: true, supabase };
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const adminGuard = await requireAdmin(request, response);
  if (!adminGuard.ok) {
    return adminGuard.response;
  }
  const { supabase } = adminGuard;

  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select(
      "id, is_enabled, start_time, end_time, announcement_message_ja, announcement_message_en, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[API/Action Error - GET /api/admin/maintenance]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: (data ?? null) as MaintenanceScheduleRow | null,
  });
}

export async function PUT(request: NextRequest) {
  return saveMaintenance(request);
}

export async function POST(request: NextRequest) {
  return saveMaintenance(request);
}

export async function PATCH(request: NextRequest) {
  return saveMaintenance(request);
}

async function saveMaintenance(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const adminGuard = await requireAdmin(request, response);
  if (!adminGuard.ok) {
    return adminGuard.response;
  }
  const { supabase } = adminGuard;

  let body: MaintenanceUpdateBody;
  try {
    body = (await request.json()) as MaintenanceUpdateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }

  const startTimestamp = new Date(body.start_time).getTime();
  const endTimestamp = new Date(body.end_time).getTime();
  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    endTimestamp <= startTimestamp
  ) {
    return NextResponse.json({ ok: false, message: "invalid_time_range" }, { status: 400 });
  }

  const upsertPayload: Record<string, unknown> = {
    is_enabled: body.is_enabled === true,
    start_time: new Date(startTimestamp).toISOString(),
    end_time: new Date(endTimestamp).toISOString(),
    announcement_message_ja: String(body.announcement_message_ja ?? ""),
    announcement_message_en: String(body.announcement_message_en ?? ""),
  };
  if (typeof body.id === "string" && body.id.length > 0) {
    upsertPayload.id = body.id;
  }

  const { data, error } = await supabase
    .from("maintenance_schedules")
    .upsert(upsertPayload, { onConflict: "id" })
    .select(
      "id, is_enabled, start_time, end_time, announcement_message_ja, announcement_message_en, updated_at",
    )
    .single();

  if (error) {
    console.error("[API/Action Error - PUT /api/admin/maintenance]:", error);
    return NextResponse.json({ ok: false, message: "save_error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: data as MaintenanceScheduleRow,
  });
}
