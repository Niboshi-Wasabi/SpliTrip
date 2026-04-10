import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fira_Code, Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppProviders } from "@/app/providers";
import { BottomNav } from "@/components/bottom-nav";
import { localeUsesLatinScript } from "@/lib/i18n/latin-script-locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Mono is sparse on first paint; avoid unused preload warnings in DevTools.
  preload: false,
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  preload: false,
});

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
  const { locale } = await params;
  const direction = locale === "ar" ? "rtl" : "ltr";

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const useLatinMonoStack = localeUsesLatinScript(locale);
  const htmlClassName = [
    geistSans.variable,
    geistMono.variable,
    useLatinMonoStack ? firaCode.variable : "",
    "h-full antialiased",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang={locale}
      dir={direction}
      data-mono-stack={useLatinMonoStack ? "latin" : "geist"}
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
            {children}
            <BottomNav />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
