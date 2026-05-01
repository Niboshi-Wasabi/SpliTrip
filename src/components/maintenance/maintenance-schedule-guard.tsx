"use client";

import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  computeMaintenanceScheduleWindowState,
  type MaintenanceScheduleRow,
} from "@/lib/maintenance-schedule";
import { stripMarkdownForPlainDisplay } from "@/lib/strip-markdown-for-plain-display";

type MaintenanceStatusResponse = {
  ok: boolean;
  schedule: MaintenanceScheduleRow | null;
  isAdmin: boolean;
  shouldShowPreNoticeBanner: boolean;
  shouldRedirectToMaintenance: boolean;
};

const fetcher = async (url: string): Promise<MaintenanceStatusResponse> => {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`maintenance status failed: ${response.status}`);
  }
  return (await response.json()) as MaintenanceStatusResponse;
};

function formatWindowText(
  locale: AppLocale,
  startIso: string,
  endIso: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startIso))} 〜 ${formatter.format(new Date(endIso))}`;
}

export function MaintenanceScheduleGuard() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const maintenanceTranslations = useTranslations("Maintenance");
  const { data } = useSWR<MaintenanceStatusResponse>(
    "/api/maintenance/status",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    },
  );

  const windowState = useMemo(
    () => computeMaintenanceScheduleWindowState(data?.schedule ?? null),
    [data?.schedule],
  );

  const normalizedPathname = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && routing.locales.includes(segments[0] as AppLocale)) {
      return `/${segments.slice(1).join("/")}`;
    }
    return pathname;
  }, [pathname]);

  useEffect(() => {
    if (!data?.shouldRedirectToMaintenance) {
      return;
    }
    if (normalizedPathname === "/maintenance") {
      return;
    }
    if (normalizedPathname.startsWith("/admin")) {
      return;
    }
    router.replace("/maintenance", { locale });
  }, [data?.shouldRedirectToMaintenance, locale, normalizedPathname, router]);

  const announcementRawText = useMemo(() => {
    if (!data?.schedule) {
      return "";
    }
    return locale === "ja"
      ? data.schedule.announcement_message_ja
      : data.schedule.announcement_message_en;
  }, [data?.schedule, locale]);

  const announcementPlainText = useMemo(
    () => stripMarkdownForPlainDisplay(announcementRawText).trim(),
    [announcementRawText],
  );

  if (!data?.schedule || !windowState.inPreNoticeWindow || !data.shouldShowPreNoticeBanner) {
    return null;
  }

  const localizedWindowText = formatWindowText(
    locale,
    data.schedule.start_time,
    data.schedule.end_time,
  );

  const periodLeadText = maintenanceTranslations("scheduledNoticeLead", {
    period: localizedWindowText,
  });

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm leading-snug text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div className="font-semibold">{maintenanceTranslations("scheduledNoticeTitle")}</div>
      <div>{periodLeadText}</div>
      {announcementPlainText.length > 0 ? (
        <div className="whitespace-pre-wrap text-left md:text-center">
          {announcementPlainText}
        </div>
      ) : null}
    </div>
  );
}
