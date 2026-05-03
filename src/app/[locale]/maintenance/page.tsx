import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  fetchMaintenanceSchedulesForPublicRead,
  selectCurrentMaintenanceSchedule,
} from "@/lib/maintenance-schedule";
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

export default async function MaintenancePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }
  setRequestLocale(localeParam);
  const translations = await getTranslations("Maintenance");

  const scheduleRows = await fetchMaintenanceSchedulesForPublicRead();
  const activeScheduleRow = selectCurrentMaintenanceSchedule(scheduleRows);
  const scheduleMessageMarkdown =
    localeParam === "en"
      ? (activeScheduleRow?.announcement_message_en ?? "")
      : (activeScheduleRow?.announcement_message_ja ?? "");
  const hasScheduleMarkdownBody = scheduleMessageMarkdown.trim().length > 0;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {translations("headline")}
        </h1>
        {hasScheduleMarkdownBody ? (
          <div className="mt-6 text-left">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {translations("announcementLabel")}
            </p>
            <SafeMarkdown
              markdown={scheduleMessageMarkdown}
              className="prose prose-sm dark:prose-invert prose-zinc mt-3 max-w-none text-left"
            />
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {translations("body")}
          </p>
        )}
        <div className="mt-8 flex w-full flex-col gap-3">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "min-h-[44px] w-full",
            )}
          >
            {translations("tryAgain")}
          </Link>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{translations("adminLoginLead")}</p>
            <Link
              href="/login/staff"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "mt-3 min-h-[44px] w-full",
              )}
            >
              {translations("adminLoginLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
