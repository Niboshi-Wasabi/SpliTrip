export const MAINTENANCE_PRE_NOTICE_MS = 24 * 60 * 60 * 1000;

export type MaintenanceScheduleRow = {
  id: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  announcement_message_ja: string;
  announcement_message_en: string;
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
  enabledSchedules.sort((leftSchedule, rightSchedule) => {
    return (
      new Date(leftSchedule.start_time).getTime() -
      new Date(rightSchedule.start_time).getTime()
    );
  });
  return enabledSchedules[0] ?? null;
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
