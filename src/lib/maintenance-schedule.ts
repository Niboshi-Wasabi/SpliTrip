import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/utils/supabase/env";

export const MAINTENANCE_PRE_NOTICE_MS = 24 * 60 * 60 * 1000;

/** メンテ告知の緊急度。NULL は未設定（従来参加ロジックのみ）。複数 enabled のうち1件でも `high` があれば、選択対象は `high` の行に限定される。 */
export type MaintenanceScheduleMessageUrgency = "normal" | "high";

export type MaintenanceScheduleRow = {
  id: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  announcement_message_ja: string;
  announcement_message_en: string;
  message_urgency: MaintenanceScheduleMessageUrgency | null;
  updated_at?: string;
};

export type MaintenanceScheduleWindowState = {
  isEnabled: boolean;
  inPreNoticeWindow: boolean;
  inMaintenanceWindow: boolean;
};

export function selectCurrentMaintenanceSchedule(
  scheduleRows: MaintenanceScheduleRow[],
): MaintenanceScheduleRow | null {
  const enabledSchedules = scheduleRows.filter(
    (scheduleRow) => scheduleRow.is_enabled === true,
  );
  if (enabledSchedules.length === 0) {
    return null;
  }
  const hasHighUrgencyEnabled = enabledSchedules.some(
    (scheduleRow) => scheduleRow.message_urgency === "high",
  );
  let candidateSchedules = enabledSchedules;
  if (hasHighUrgencyEnabled) {
    candidateSchedules = enabledSchedules.filter(
      (scheduleRow) => scheduleRow.message_urgency === "high",
    );
  }
  if (candidateSchedules.length === 0) {
    return null;
  }
  candidateSchedules.sort((leftSchedule, rightSchedule) => {
    return (
      new Date(leftSchedule.start_time).getTime() -
      new Date(rightSchedule.start_time).getTime()
    );
  });
  return candidateSchedules[0] ?? null;
}

export function computeMaintenanceScheduleWindowState(
  scheduleRow: MaintenanceScheduleRow | null,
  nowDate: Date = new Date(),
): MaintenanceScheduleWindowState {
  if (!scheduleRow || !scheduleRow.is_enabled) {
    return {
      isEnabled: false,
      inPreNoticeWindow: false,
      inMaintenanceWindow: false,
    };
  }
  const startTimestamp = new Date(scheduleRow.start_time).getTime();
  const endTimestamp = new Date(scheduleRow.end_time).getTime();
  const nowTimestamp = nowDate.getTime();

  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
    return {
      isEnabled: false,
      inPreNoticeWindow: false,
      inMaintenanceWindow: false,
    };
  }

  const inMaintenanceWindow =
    nowTimestamp >= startTimestamp && nowTimestamp < endTimestamp;
  const inPreNoticeWindow =
    nowTimestamp >= startTimestamp - MAINTENANCE_PRE_NOTICE_MS &&
    nowTimestamp < startTimestamp;

  return {
    isEnabled: true,
    inPreNoticeWindow,
    inMaintenanceWindow,
  };
}

/**
 * `maintenance_schedules` は anon SELECT 可（RLS）。SSR のメンテページで告知文を表示するために使う。
 * Anon-readable schedule rows for SSR maintenance copy (markdown body).
 */
export async function fetchMaintenanceSchedulesForPublicRead(): Promise<
  MaintenanceScheduleRow[]
> {
  const env = getSupabaseEnv();
  if (!env) {
    return [];
  }
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select(
      "id, is_enabled, start_time, end_time, announcement_message_ja, announcement_message_en, message_urgency, updated_at",
    )
    .order("start_time", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[fetchMaintenanceSchedulesForPublicRead]:", error);
    return [];
  }

  return (data ?? []) as MaintenanceScheduleRow[];
}
