import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { SPLITRIP_REQUEST_PATHNAME_HEADER_NAME } from "@/lib/i18n/splitrip-request-headers";
import { AppProviders } from "@/app/providers";
import { BottomNav } from "@/components/bottom-nav";
import { SyncDocumentLocale } from "@/components/i18n/sync-document-locale";
import { AppSiteFooter } from "@/components/layout/app-site-footer";
import { PublishedAppAnnouncements } from "@/components/announcements/published-app-announcements";
import { WhatsNewModalGate } from "@/components/announcements/whats-new-modal-gate";
import { MaintenanceAnnouncementBanner } from "@/components/maintenance/maintenance-announcement-banner";
import { MaintenanceScheduleGuard } from "@/components/maintenance/maintenance-schedule-guard";
import { getLocaleHtmlClassName } from "@/lib/i18n/app-gfonts";
import { getUiMonoStackId, getUiSansStackId } from "@/lib/i18n/locale-ui-fonts";
import { stripLocaleFromPathname } from "@/utils/supabase/middleware";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * PWA として認識させるために appleWebApp 等を設定する。
 * Set appleWebApp & themeColor so iOS / Android treat the app as installable PWA.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const metadataTranslations = await getTranslations({
    locale: safeLocale,
    namespace: "AppMetadata",
  });

  return {
    title: metadataTranslations("title"),
    description: metadataTranslations("description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "SpliTrip",
    },
  };
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Per-locale message provider. `<html>` / `<body>` are in the root `app/layout.tsx` (Next 16+).
 * ロケールごとのメッセージ。`<html>` / `<body>` はルート `app/layout.tsx` に集約（Next 16+）。
 */
export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale: localeParam } = await params;
  const direction = "ltr";

  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }

  const locale = localeParam as AppLocale;

  setRequestLocale(localeParam);
  const messages = await getMessages();

  const headerList = await headers();
  const requestPathnameFromMiddleware = headerList.get(
    SPLITRIP_REQUEST_PATHNAME_HEADER_NAME,
  );
  const pathWithoutLocalePrefix = requestPathnameFromMiddleware
    ? stripLocaleFromPathname(requestPathnameFromMiddleware)
    : null;
  const showPublishedAppAnnouncementsStrip =
    pathWithoutLocalePrefix === null || pathWithoutLocalePrefix !== "/";

  const uiSansStackId = getUiSansStackId(locale);
  const uiMonoStackId = getUiMonoStackId(locale);
  const htmlClassName = getLocaleHtmlClassName(locale);

  return (
    <>
      <SyncDocumentLocale
        dataUiMono={uiMonoStackId}
        dataUiSans={uiSansStackId}
        direction={direction}
        htmlClassName={htmlClassName}
        lang={localeParam}
      />
      <NextIntlClientProvider messages={messages}>
        <AppProviders>
          <MaintenanceAnnouncementBanner />
          <MaintenanceScheduleGuard />
          {showPublishedAppAnnouncementsStrip ? (
            <PublishedAppAnnouncements locale={locale} />
          ) : null}
          <WhatsNewModalGate locale={locale} />
          {children}
          <AppSiteFooter />
          <BottomNav />
        </AppProviders>
      </NextIntlClientProvider>
    </>
  );
}
