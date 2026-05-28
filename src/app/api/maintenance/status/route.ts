import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  computeMaintenanceScheduleWindowState,
  selectCurrentMaintenanceSchedule,
  type MaintenanceScheduleRow,
} from "@/lib/maintenance-schedule";

export async function GET(request: NextRequest) {
  const safeResponse = {
    ok: true,
    schedule: null as MaintenanceScheduleRow | null,
    isAdmin: false,
    shouldShowPreNoticeBanner: false,
    shouldRedirectToMaintenance: false,
  };
  try {
    const response = NextResponse.json({ ok: false }, { status: 500 });
    const supabase = createRouteHandlerSupabaseClient(request, response);
    if (!supabase) {
      return NextResponse.json(safeResponse);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.is_admin === true;
    }

    const { data: scheduleRows, error } = await supabase
      .from("maintenance_schedules")
      .select(
        "id, is_enabled, start_time, end_time, announcement_message_ja, announcement_message_en, message_urgency, updated_at",
      )
      .order("start_time", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[API/Action Error - GET /api/maintenance/status]:", error);
      return NextResponse.json(safeResponse);
    }

    const selectedSchedule = selectCurrentMaintenanceSchedule(
      (scheduleRows ?? []) as MaintenanceScheduleRow[],
    );
    const windowState = computeMaintenanceScheduleWindowState(selectedSchedule);

    return NextResponse.json({
      ok: true,
      schedule: selectedSchedule,
      isAdmin,
      shouldShowPreNoticeBanner: windowState.inPreNoticeWindow,
      shouldRedirectToMaintenance:
        windowState.inMaintenanceWindow && !isAdmin,
    });
  } catch (error) {
    console.error("[API/Action Error - GET /api/maintenance/status unexpected]:", error);
    return NextResponse.json(safeResponse);
  }
}
