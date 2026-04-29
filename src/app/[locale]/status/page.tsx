import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/logo-mark";
import {
  fetchPublicSystemStatusRows,
  rollupSystemStatuses,
  SYSTEM_STATUS_SERVICE_KEYS,
  type SystemOperationalStatus,
  type SystemStatusRow,
  type SystemStatusServiceKey,
} from "@/lib/system-status";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PageParams = { params: Promise<{ locale: string }> };

function formatStatusTimestamp(
  isoTimestamp: string,
  locale: AppLocale,
): string {
  const parsed = new Date(isoTimestamp);
  if (!Number.isFinite(parsed.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function statusIconForCode(status: SystemOperationalStatus) {
  switch (status) {
    case "operational":
      return {
        Icon: CheckCircle2,
        className: "text-emerald-500",
      };
    case "degraded":
      return {
        Icon: AlertTriangle,
        className: "text-amber-500",
      };
    case "partial_outage":
      return {
        Icon: AlertTriangle,
        className: "text-orange-500",
      };
    case "major_outage":
      return {
        Icon: XCircle,
        className: "text-red-500",
      };
    default:
      return {
        Icon: AlertTriangle,
        className: "text-zinc-500",
      };
  }
}

function serviceNameKey(
  serviceKey: SystemStatusServiceKey,
):
  | "serviceCoreApiDatabase"
  | "serviceAuthentication"
  | "serviceStripePayments"
  | "serviceReceiptAi"
  | "serviceWebPush" {
  switch (serviceKey) {
    case "core_api_database":
      return "serviceCoreApiDatabase";
    case "authentication":
      return "serviceAuthentication";
    case "stripe_payments":
      return "serviceStripePayments";
    case "receipt_ai":
      return "serviceReceiptAi";
    case "web_push_notifications":
      return "serviceWebPush";
    default: {
      const unreachable: never = serviceKey;
      return unreachable;
    }
  }
}

function statusLabelKey(
  status: SystemOperationalStatus,
):
  | "statusOperational"
  | "statusDegraded"
  | "statusPartialOutage"
  | "statusMajorOutage" {
  switch (status) {
    case "operational":
      return "statusOperational";
    case "degraded":
      return "statusDegraded";
    case "partial_outage":
      return "statusPartialOutage";
    case "major_outage":
      return "statusMajorOutage";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function summaryKeyFromRollup(
  rollup: SystemOperationalStatus,
):
  | "summaryAllOperational"
  | "summaryDegraded"
  | "summaryPartialOutage"
  | "summaryMajorOutage" {
  switch (rollup) {
    case "operational":
      return "summaryAllOperational";
    case "degraded":
      return "summaryDegraded";
    case "partial_outage":
      return "summaryPartialOutage";
    case "major_outage":
      return "summaryMajorOutage";
    default: {
      const unreachable: never = rollup;
      return unreachable;
    }
  }
}

function summaryBannerClass(rollup: SystemOperationalStatus): string {
  switch (rollup) {
    case "operational":
      return "border-emerald-800/60 bg-emerald-950/35 text-emerald-100";
    case "degraded":
      return "border-amber-800/60 bg-amber-950/40 text-amber-100";
    case "partial_outage":
      return "border-orange-800/60 bg-orange-950/40 text-orange-100";
    case "major_outage":
      return "border-red-900/60 bg-red-950/45 text-red-100";
    default:
      return "border-zinc-800 bg-zinc-950/50 text-zinc-200";
  }
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = hasLocale(routing.locales, localeParam)
    ? localeParam
    : routing.defaultLocale;
  const pageTranslations = await getTranslations({
    locale,
    namespace: "Status",
  });
  return {
    title: pageTranslations("metaTitle"),
    description: pageTranslations("metaDescription"),
    robots: { index: true, follow: true },
  };
}

export default async function SystemStatusPage({ params }: PageParams) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  setRequestLocale(localeParam);
  const t = await getTranslations("Status");

  const statusRows = await fetchPublicSystemStatusRows();
  const statusByServiceKey = new Map(
    statusRows.map((row) => [row.service_key, row] as const),
  );
  const displayRows: SystemStatusRow[] = SYSTEM_STATUS_SERVICE_KEYS.map(
    (serviceKey) => {
      const existingRow = statusByServiceKey.get(serviceKey);
      if (existingRow) {
        return existingRow;
      }
      return {
        service_key: serviceKey,
        status: "operational",
        updated_at: new Date().toISOString(),
      };
    },
  );

  const rollup = rollupSystemStatuses(displayRows.map((row) => row.status));
  const summaryMessageKey = summaryKeyFromRollup(rollup);
  const SummaryIconPack = statusIconForCode(rollup);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-zinc-950/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("backToHome")}
          </Link>
          <div className="ml-auto">
            <LogoMark className="text-base md:text-lg" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {t("pageDescription")}
        </p>

        <div
          className={cn(
            "mt-10 rounded-xl border px-4 py-5 md:px-6",
            summaryBannerClass(rollup),
          )}
          role="status"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <SummaryIconPack.Icon
              className={cn(
                "mt-0.5 h-8 w-8 shrink-0 sm:h-9 sm:w-9",
                SummaryIconPack.className,
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                {t("summaryHeading")}
              </p>
              <p className="text-lg font-semibold leading-tight tracking-tight text-zinc-50 md:text-xl">
                {t(summaryMessageKey)}
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-12 space-y-4">
          {displayRows.map((statusRow) => {
            const rowIcon = statusIconForCode(statusRow.status);
            const RowIcon = rowIcon.Icon;
            return (
              <li
                key={statusRow.service_key}
                className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-4 md:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <RowIcon
                      className={cn(
                        "mt-0.5 h-6 w-6 shrink-0 sm:h-7 sm:w-7",
                        rowIcon.className,
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100">
                        {t(serviceNameKey(statusRow.service_key))}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {t(statusLabelKey(statusRow.status))}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left text-xs text-zinc-500 sm:text-right">
                    <p className="font-medium uppercase tracking-wider text-zinc-500">
                      {t("lastUpdatedLabel")}
                    </p>
                    <p className="mt-1 text-zinc-400">
                      {formatStatusTimestamp(statusRow.updated_at, locale)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
