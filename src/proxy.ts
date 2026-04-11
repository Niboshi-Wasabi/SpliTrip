/**
 * Composes next-intl locale routing with Supabase session refresh.
 * next-intl のロケール処理と Supabase セッション更新を合成する。
 */
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing, type AppLocale } from "./i18n/routing";
import { applyAccessBasedLocaleHint } from "./lib/i18n/infer-locale-from-access";
import { applyProfilePreferredLocaleCookie } from "./lib/i18n/profile-locale-cookie";
import { isMaintenanceModeEnabled } from "./lib/maintenance";
import { finalizeSupabaseSession } from "./utils/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

function pathnameStartsWithLocaleMaintenance(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  const maybeLocale = segments[0];
  const rest = segments.slice(1);
  if (!routing.locales.includes(maybeLocale as AppLocale)) {
    return false;
  }
  return rest.length === 1 && rest[0] === "maintenance";
}

function pathnameIsMaintenancePath(pathname: string): boolean {
  if (pathname === "/maintenance") {
    return true;
  }
  return pathnameStartsWithLocaleMaintenance(pathname);
}

function pathnameAllowedDuringMaintenance(pathname: string): boolean {
  if (pathname.startsWith("/_next") || pathname.startsWith("/_vercel")) {
    return true;
  }
  if (pathnameIsMaintenancePath(pathname)) {
    return true;
  }
  return false;
}

function buildMaintenanceRedirectUrl(request: NextRequest): URL {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (
    firstSegment &&
    routing.locales.includes(firstSegment as AppLocale)
  ) {
    return new URL(`/${firstSegment}/maintenance`, request.url);
  }
  return new URL("/maintenance", request.url);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // OAuth callback must stay on a fixed path (no locale segment). / OAuth は固定パスのままにする。
  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) {
    return finalizeSupabaseSession(
      request,
      NextResponse.next({ request }),
    );
  }

  if (
    isMaintenanceModeEnabled() &&
    !pathnameAllowedDuringMaintenance(pathname)
  ) {
    return NextResponse.redirect(buildMaintenanceRedirectUrl(request));
  }

  // Step 1: logged-in users override Accept-Language via profile cookie on the request clone.
  // 手順1: ログイン済みはプロフィール由来の Cookie をリクエストに載せる。
  const profileLocaleRequest = await applyProfilePreferredLocaleCookie(request);
  // Step 1b: first visit (no NEXT_LOCALE): geo + Accept-Language hint for redirect/rewrite.
  // 手順1b: 初回は国コードと Accept-Language で最適なロケールへ（英語ヘッダー一辺倒を防ぐ）。
  const localizedRequest = applyAccessBasedLocaleHint(profileLocaleRequest);
  // Step 2: next-intl resolves locale (cookie, Accept-Language, prefix rules).
  // 手順2: next-intl がロケールを解決（Cookie・Accept-Language・プレフィックス）。
  const intlResponse = intlMiddleware(localizedRequest);
  // Step 3: attach refreshed Supabase cookies to intl redirects/rewrites.
  // 手順3: Supabase の更新済み Cookie を intl のレスポンスへ載せる。
  return finalizeSupabaseSession(localizedRequest, intlResponse);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
