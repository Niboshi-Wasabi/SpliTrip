import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Fira_Code,
  Noto_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_TC,
  Source_Serif_4,
} from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { AppProviders } from "@/app/providers";
import { BottomNav } from "@/components/bottom-nav";
import { MaintenanceAnnouncementBanner } from "@/components/maintenance/maintenance-announcement-banner";
import {
  getLocaleGoogleSansVariable,
  getUiMonoStackId,
  getUiSansStackId,
} from "@/lib/i18n/locale-ui-fonts";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  preload: false,
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansCyrillic = Noto_Sans({
  variable: "--font-noto-sans-cyrillic",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const googleSansByKey = {
  notoJp: notoSansJp,
  notoSc: notoSansSc,
  notoTc: notoSansTc,
  notoKr: notoSansKr,
  notoCyrillic: notoSansCyrillic,
  notoArabic: notoSansArabic,
  notoDevanagari: notoSansDevanagari,
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * PWA として認識させるために appleWebApp / themeColor を設定する。
 * Set appleWebApp & themeColor so iOS / Android treat the app as installable PWA.
 */
export const metadata: Metadata = {
  title: "SpliTrip（スプリトリップ）- グループ旅行の精算アプリ",
  description:
    "グループ旅行中の立替をリアルタイムに記録し、精算を自動計算するWebアプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SpliTrip",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Per-locale HTML shell + message provider for client hooks.
 * ロケールごとの HTML と、クライアント用メッセージプロバイダ。
 *
 * Why `bg-background` on `body`: pairs with CSS variables in `globals.css` so light/dark both read from tokens.
 * 理由: `globals.css` の CSS 変数と組み合わせ、ライト/ダークをトークンで統一する。
 *
 * Why `src` + `defer` in `public/`: React 19 warns on inline `<script dangerouslySetInnerHTML>` in the React tree; `defer` satisfies `@next/next/no-sync-scripts` while keeping parse order sane.
 * 理由: React 19 はツリー内のインライン script を警告するため `public/theme-bootstrap.js` を `src` で読み込み、`defer` で同期スクリプト ESLint 違反を避ける。
 */
export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale: localeParam } = await params;
  const direction = localeParam === "ar" ? "rtl" : "ltr";

  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }

  const locale = localeParam as AppLocale;

  setRequestLocale(localeParam);
  const messages = await getMessages();

  const uiSansStackId = getUiSansStackId(locale);
  const uiMonoStackId = getUiMonoStackId(locale);
  const googleSansKey = getLocaleGoogleSansVariable(locale);

  const htmlClassName = [
    sourceSerif4.variable,
    uiMonoStackId === "fira" ? firaCode.variable : "",
    googleSansKey !== "none" ? googleSansByKey[googleSansKey].variable : "",
    "h-full antialiased",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang={localeParam}
      dir={direction}
      data-ui-sans={uiSansStackId}
      data-ui-mono={uiMonoStackId}
      className={htmlClassName}
      suppressHydrationWarning
    >
      <head>
        {/* PWA: テーマカラーをブラウザ UI に反映 / Reflect brand color in browser chrome */}
        <meta name="theme-color" content="#0f766e" />
        <script defer src="/theme-bootstrap.js" />
      </head>
      <body
        className="flex min-h-full flex-col bg-background text-foreground antialiased transition-colors"
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            <MaintenanceAnnouncementBanner />
            {children}
            <BottomNav />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
