/**
 * next-intl middleware と同一のロケール Cookie 名・検証（プロフィール注入・OAuth と整合）。
 * Same locale cookie name / validation as next-intl middleware (profile injection, OAuth).
 */
import { routing, type AppLocale } from "@/i18n/routing";

export const NEXT_INTL_LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}
