/**
 * メンテナンスモード・告知用の環境変数（サーバー／Edge の `process.env` から読む）。
 */

/** `MAINTENANCE_MODE` または `NEXT_PUBLIC_MAINTENANCE_MODE` が真なら全ページをメンテ画面へ誘導（API・一部パス除く）。 */
export function isMaintenanceModeEnabled(): boolean {
  const raw =
    (process.env.MAINTENANCE_MODE ?? process.env.NEXT_PUBLIC_MAINTENANCE_MODE ?? "")
      .trim()
      .toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/** 非空なら全ページ上部に告知バナーを出す（メンテモード有無に依存しない）。 */
export function getMaintenanceAnnouncementText(): string {
  return (process.env.NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT ?? "").trim();
}
