import {
  Fira_Code,
  Noto_Sans_JP,
} from "next/font/google";
import {
  getLocaleGoogleSansVariable,
  getUiMonoStackId,
} from "@/lib/i18n/locale-ui-fonts";
import type { AppLocale } from "@/i18n/routing";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  preload: false,
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const googleSansByKey = {
  notoJp: notoSansJp,
} as const;

/**
 * `html` の `className` 用。next/font の呼び出しはこのモジュールに集約する。
 */
export function getLocaleHtmlClassName(locale: AppLocale): string {
  const googleSansKey = getLocaleGoogleSansVariable(locale);
  const uiMonoStackId = getUiMonoStackId(locale);
  return [
    uiMonoStackId === "fira" ? firaCode.variable : "",
    googleSansKey !== "none" ? googleSansByKey[googleSansKey].variable : "",
    "h-full antialiased",
  ]
    .filter(Boolean)
    .join(" ");
}

export { firaCode, notoSansJp };
