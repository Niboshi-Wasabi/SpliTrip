/**
 * Composes next-intl locale routing with Supabase session refresh.
 * next-intl のロケール処理と Supabase セッション更新を合成する。
 */
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing, type AppLocale } from "./i18n/routing";
import { applyAccessBasedLocaleHint } from "./lib/i18n/infer-locale-from-access";
import { applyProfilePreferredLocaleCookie } from "./lib/i18n/profile-locale-cookie";
import { isMaintenanceModeEnabledForRequest } from "./lib/maintenance";
import { finalizeSupabaseSession } from "./utils/supabase/middleware";
import { getSupabaseEnv } from "./utils/supabase/env";
import { isAdminStepUpVerified } from "./lib/auth/two-factor";

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

function localeFromPathname(pathname: string): AppLocale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (firstSegment && routing.locales.includes(firstSegment as AppLocale)) {
    return firstSegment as AppLocale;
  }
  return routing.defaultLocale;
}

function isAdminPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const firstSegment = segments[0];
  if (routing.locales.includes(firstSegment as AppLocale)) {
    return segments[1] === "admin";
  }
  return firstSegment === "admin";
}

/**
 * 管理画面の Step-Up 再認証ページ（`/admin/verify` および `/{locale}/admin/verify`）。
 * Excludes these from the step-up redirect loop.
 */
function isAdminVerifyPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  if (routing.locales.includes(segments[0] as AppLocale)) {
    return segments[1] === "admin" && segments[2] === "verify";
  }
  return segments[0] === "admin" && segments[1] === "verify";
}

type AdminContext = { isAdmin: boolean; userId: string | null };

async function resolveAdminContext(request: NextRequest): Promise<AdminContext> {
  const env = getSupabaseEnv();
  if (!env) {
    return { isAdmin: false, userId: null };
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // read-only check in proxy phase
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { isAdmin: false, userId: null };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    return { isAdmin: true, userId: user.id };
  }
  return { isAdmin: false, userId: null };
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

  // Supabase `redirectTo` は `/auth/callback` 固定。ここだけロケール付きに書き換えない（next-intl を通さない）。
  // それ以外の `/auth/*`（例: `/auth/2fa`）は intl で `/{locale}/auth/...` に合わせる。なければ 404 になる。
  // OAuth callback must stay on a fixed path (no locale). Other `/auth/*` routes are under `app/[locale]/`.
  const isApi = pathname.startsWith("/api");
  const isAuthCallback =
    pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
  if (isApi || isAuthCallback) {
    return finalizeSupabaseSession(
      request,
      NextResponse.next({ request }),
    );
  }

  const { isAdmin: isAdminUser, userId: adminUserId } =
    await resolveAdminContext(request);

  if (isAdminPath(pathname) && !isAdminUser) {
    const locale = localeFromPathname(pathname);
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // 管理者は短寿命の admin_stepup_verified なしでは /admin を除く管理領域へ入れない。
  // Admins need WebAuthn step-up (cookie) except on the verify page itself.
  if (
    isAdminUser &&
    adminUserId &&
    isAdminPath(pathname) &&
    !isAdminVerifyPath(pathname) &&
    !isAdminStepUpVerified(request, adminUserId)
  ) {
    const locale = localeFromPathname(pathname);
    return NextResponse.redirect(new URL(`/${locale}/admin/verify`, request.url));
  }

  if (
    (await isMaintenanceModeEnabledForRequest()) &&
    !isAdminUser &&
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
