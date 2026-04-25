/**
 * メンテナンスモード・告知: まず env（緊急オーバーライド）、次に `system_settings`（DB）。
 */
import { getMaintenanceBannerMessageFromDatabase, getMaintenanceModeFromDatabase } from "./system-settings";

/** `MAINTENANCE_MODE` / `NEXT_PUBLIC_MAINTENANCE_MODE` が真なら即メンテ（DBより優先）。 */
export function isMaintenanceModeEnabledByEnv(): boolean {
  const raw =
    (process.env.MAINTENANCE_MODE ?? process.env.NEXT_PUBLIC_MAINTENANCE_MODE ?? "")
      .trim()
      .toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

// 注意: isMaintenanceModeEnabled() は削除済み（非推奨関数）
// 代替: isMaintenanceModeEnabledForRequest() を使用

/** env が真、または DB の `maintenance_mode.enabled`。 */
export async function isMaintenanceModeEnabledForRequest(): Promise<boolean> {
  if (isMaintenanceModeEnabledByEnv()) {
    return true;
  }
  return getMaintenanceModeFromDatabase();
}

/** 告知: env 文字列、なければ DB `maintenance_announcement.message`。 */
export async function getMaintenanceAnnouncementTextAsync(): Promise<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT ?? "").trim();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  return getMaintenanceBannerMessageFromDatabase();
}

/** 同期 API 互換: env のみ（クライアント等で使う場合のフォールバック）。 */
export function getMaintenanceAnnouncementText(): string {
  return (process.env.NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT ?? "").trim();
}
