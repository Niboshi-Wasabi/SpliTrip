import { getTranslations } from "next-intl/server";
import { getMaintenanceAnnouncementTextAsync } from "@/lib/maintenance";
import { stripMarkdownForPlainDisplay } from "@/lib/strip-markdown-for-plain-display";

/**
 * メンテ前の告知。`NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT` または `system_settings.maintenance_announcement`。
 */
export async function MaintenanceAnnouncementBanner() {
  const announcementText = await getMaintenanceAnnouncementTextAsync();
  if (!announcementText) {
    return null;
  }
  const announcementsPlainBody = stripMarkdownForPlainDisplay(announcementText).trim();
  if (announcementsPlainBody.length === 0) {
    return null;
  }
  const translations = await getTranslations("Maintenance");
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm leading-snug text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div className="font-semibold">{translations("announcementLabel")}</div>
      <div className="whitespace-pre-wrap text-left md:text-center">{announcementsPlainBody}</div>
    </div>
  );
}
