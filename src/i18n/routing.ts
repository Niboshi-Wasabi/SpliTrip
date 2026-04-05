/**
 * Supported locales and URL prefix strategy for next-intl.
 * next-intl 向けロケール一覧と URL プレフィックス方針。
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
