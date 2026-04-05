/**
 * Resolves UI locale from next-intl's cookie when building server redirects (OAuth callbacks).
 * OAuth コールバックなどサーバー側リダイレクトで next-intl の Cookie からロケールを解決する。
 */
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";

const NEXT_INTL_LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * @param request - Incoming OAuth (or similar) request / OAuth などのリクエスト
 * @returns Localized `/dashboard` path / ロケール付き `/dashboard` パス
 */
export function localizedDashboardPathFromRequest(
  request: NextRequest,
): string {
  const raw = request.cookies.get(NEXT_INTL_LOCALE_COOKIE)?.value;
  const locale =
    raw === "en" || raw === "ja" ? raw : routing.defaultLocale;
  return withLocalePrefix(locale, "/dashboard");
}
