import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing, type AppLocale } from "@/i18n/routing";
import { isAppLocale } from "@/lib/i18n/next-intl-locale";
import { getLocaleHtmlClassName } from "@/lib/i18n/app-gfonts";
import { getUiMonoStackId, getUiSansStackId } from "@/lib/i18n/locale-ui-fonts";
import "./globals.css";

export const metadata: Metadata = {
  other: {
    "theme-color": "#0f766e",
    "mobile-web-app-capable": "yes",
  },
};

/**
 * Next.js 16+ ではルート `layout` に `<html>` / `<body>` が必須。
 * `NEXT_LOCALE` クッキーがあれば `html` の初期属性に使い、未設定は `defaultLocale`。
 * URL のロケールは `[locale]/layout` の `SyncDocumentLocale` で確実に合わせる（SPA 遷移含む）。
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLocaleCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: AppLocale = isAppLocale(rawLocaleCookie || "")
    ? (rawLocaleCookie as AppLocale)
    : routing.defaultLocale;
  const htmlClassName = getLocaleHtmlClassName(locale);

  return (
    <html
      className={htmlClassName}
      data-ui-mono={getUiMonoStackId(locale)}
      data-ui-sans={getUiSansStackId(locale)}
      dir="ltr"
      lang={locale}
      suppressHydrationWarning
    >
      <body
        className="font-serif flex min-h-full flex-col bg-background text-foreground antialiased transition-colors"
        suppressHydrationWarning
      >
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
