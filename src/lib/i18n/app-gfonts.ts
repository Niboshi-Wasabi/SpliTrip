import {
  Fira_Code,
  Noto_Serif_JP,
  Source_Serif_4,
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

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const googleSansByKey = {
  notoJp: notoSerifJp,
} as const;

/**
 * `html` の `className` 用。next/font の呼び出しはこのモジュールに集約する。
 */
export function getLocaleHtmlClassName(locale: AppLocale): string {
  const googleSansKey = getLocaleGoogleSansVariable(locale);
  const uiMonoStackId = getUiMonoStackId(locale);
  return [
    sourceSerif4.variable,
    uiMonoStackId === "fira" ? firaCode.variable : "",
    googleSansKey !== "none" ? googleSansByKey[googleSansKey].variable : "",
    "h-full antialiased",
  ]
    .filter(Boolean)
    .join(" ");
}

export { firaCode, notoSerifJp, sourceSerif4 };
