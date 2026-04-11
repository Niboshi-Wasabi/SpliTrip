import { getTranslations } from "next-intl/server";
import { getMaintenanceAnnouncementText } from "@/lib/maintenance";

/**
 * メンテ前の告知。`NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT` が空なら何も描画しない。
 */
export async function MaintenanceAnnouncementBanner() {
  const announcementText = getMaintenanceAnnouncementText();
  if (!announcementText) {
    return null;
  }
  const translations = await getTranslations("Maintenance");
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm leading-snug text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <span className="font-semibold">{translations("announcementLabel")}</span>
      <span className="mx-1">—</span>
      <span>{announcementText}</span>
    </div>
  );
}
