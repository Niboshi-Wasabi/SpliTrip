import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  fetchMaintenanceSchedulesForPublicRead,
  selectCurrentMaintenanceSchedule,
} from "@/lib/maintenance-schedule";
import { fetchPublishedAnnouncementListForLocale } from "@/lib/public-app-announcements";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    return { title: "SpliTrip", robots: { index: false, follow: false } };
  }
  const translations = await getTranslations({
    locale: localeParam,
    namespace: "Maintenance",
  });
  return {
    title: translations("pageTitle"),
    robots: { index: false, follow: false },
  };
}

function formatApproximateMaintenanceWindow(
  isoStart: string,
  isoEnd: string,
  localeParam: AppLocale,
): string | null {
  const startDate = new Date(isoStart);
  const endDate = new Date(isoEnd);
  const startMilliseconds = startDate.getTime();
  const endMilliseconds = endDate.getTime();
  if (
    !Number.isFinite(startMilliseconds) ||
    !Number.isFinite(endMilliseconds)
  ) {
    return null;
  }
  const formatter = new Intl.DateTimeFormat(
    localeParam === "en" ? "en-US" : "ja-JP",
    {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  );
  const betweenLabel = localeParam === "en" ? " → " : " 〜 ";
  return `${formatter.format(startDate)}${betweenLabel}${formatter.format(endDate)}`;
}

export default async function MaintenancePage({ params }: PageProps) {
  const { locale: localeParamString } = await params;
  if (!hasLocale(routing.locales, localeParamString)) {
    notFound();
  }
  const localeParam = localeParamString as AppLocale;
  setRequestLocale(localeParamString);

  const [
    maintenanceTranslations,
    appAnnouncementCopy,
    publishedAnnouncementItems,
    scheduleRows,
  ] = await Promise.all([
    getTranslations("Maintenance"),
    getTranslations({
      locale: localeParamString,
      namespace: "AppAnnouncements",
    }),
    fetchPublishedAnnouncementListForLocale(localeParam),
    fetchMaintenanceSchedulesForPublicRead(),
  ]);
  const activeScheduleRow = selectCurrentMaintenanceSchedule(scheduleRows);
  const scheduleMessageMarkdown =
    localeParam === "en"
      ? (activeScheduleRow?.announcement_message_en ?? "")
      : (activeScheduleRow?.announcement_message_ja ?? "");
  const hasScheduleMarkdownBody = scheduleMessageMarkdown.trim().length > 0;

  const scheduleWindowBadgeText =
    activeScheduleRow && activeScheduleRow.is_enabled === true
      ? formatApproximateMaintenanceWindow(
          activeScheduleRow.start_time,
          activeScheduleRow.end_time,
          localeParam,
        )
      : null;

  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-10 text-zinc-100 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Badge
          variant="outline"
          className={cn(
            "border-amber-950/70 bg-amber-950/50 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/95",
          )}
        >
          {maintenanceTranslations("emergencyBadge")}
        </Badge>

        <h1 className="mt-6 font-serif text-3xl leading-none tracking-tight text-zinc-50 md:text-4xl">
          {maintenanceTranslations("emergencyHeadline")}
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-zinc-400">
          {maintenanceTranslations("emergencyLead")}
        </p>

        {scheduleWindowBadgeText !== null ? (
          <div
            className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/55 p-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            role="note"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {maintenanceTranslations("scheduleWindowHeading")}
            </p>
            <p className="mt-2 font-mono text-sm leading-snug font-medium tracking-tight text-zinc-200">
              {scheduleWindowBadgeText}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              {maintenanceTranslations("scheduleWindowTzNote")}
            </p>
          </div>
        ) : null}

        <div className="mt-12 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {maintenanceTranslations("operatorMessageHeading")}
          </p>
          {hasScheduleMarkdownBody ? (
            <SafeMarkdown
              markdown={scheduleMessageMarkdown}
              className="prose prose-sm dark:prose-invert prose-zinc mt-4 max-w-none text-zinc-300"
            />
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              {maintenanceTranslations("body")}
            </p>
          )}
        </div>

        {publishedAnnouncementItems.length > 0 ? (
          <section
            className="mt-14 border-t border-zinc-800/90 pt-10"
            aria-labelledby="maintenance-announcements-heading"
          >
            <h2
              id="maintenance-announcements-heading"
              className="font-serif text-lg leading-tight tracking-tight text-zinc-50"
            >
              {maintenanceTranslations("announcementsListHeading")}
            </h2>
            <ul className="mt-7 space-y-8">
              {publishedAnnouncementItems.map((announcementItem) => {
                const titleShown =
                  announcementItem.title.trim().length > 0
                    ? announcementItem.title.trim()
                    : appAnnouncementCopy("fallbackTitle");
                return (
                  <li
                    key={announcementItem.id}
                    className="border-b border-zinc-800/70 pb-8 last:border-b-0 last:pb-0"
                  >
                    <h3 className="font-serif text-base leading-tight tracking-tight text-zinc-100">
                      {titleShown}
                    </h3>
                    {announcementItem.content.trim().length > 0 ? (
                      <SafeMarkdown
                        markdown={announcementItem.content}
                        className="prose prose-sm dark:prose-invert prose-zinc mt-3 max-w-none text-zinc-300"
                      />
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">
                        {appAnnouncementCopy("fallbackBody")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="mt-14">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "flex min-h-[44px] w-full justify-center rounded-md border-zinc-700 bg-zinc-900/35 text-base text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900/70",
            )}
          >
            {maintenanceTranslations("tryAgain")}
          </Link>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
          {maintenanceTranslations("emergencyFooterHint")}
        </p>
      </div>
    </main>
  );
}
