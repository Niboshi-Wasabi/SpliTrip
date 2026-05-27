import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import {
  fetchPublicSystemStatusRows,
  mergeMissingSystemStatusRows,
} from "@/lib/system-status";
import { routing, type AppLocale } from "@/i18n/routing";
import { SystemStatusPublicClient } from "@/components/status/system-status-public-client";

type PageParams = { params: Promise<{ locale: string }> };

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

  const statusRows = await fetchPublicSystemStatusRows();
  const initialDisplayRows = mergeMissingSystemStatusRows(statusRows);

  return (
    <SystemStatusPublicClient
      locale={locale}
      initialDisplayRows={initialDisplayRows}
    />
  );
}
