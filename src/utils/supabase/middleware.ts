/**
 * Refresh Supabase session cookies on any proxied response; gate dashboard/settings when unauthenticated.
 * プロキシ経由のレスポンスへセッション Cookie を載せ替え、未認証時は dashboard/settings をブロックする。
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSupabaseEnv } from "./env";
import { isTwoFactorVerified } from "@/lib/auth/two-factor";

/**
 * Removes optional `/{locale}` prefix (any app locale) so auth rules match localized URLs.
 * 先頭の `/{locale}` を除き、認証判定をローカライズ済み URL に適用する。
 */
export function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }
  const [first, ...rest] = segments;
  if (routing.locales.includes(first as AppLocale)) {
    return rest.length === 0 ? "/" : `/${rest.join("/")}`;
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function isProtectedPath(pathname: string): boolean {
  const p = stripLocaleFromPathname(pathname);
  return p.startsWith("/dashboard") || p.startsWith("/settings");
}

function resolveLocaleFromPathname(pathname: string): AppLocale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && routing.locales.includes(segment as AppLocale)) {
    return segment as AppLocale;
  }
  return routing.defaultLocale;
}

/**
 * Runs `getUser` refresh and copies Set-Cookie onto the provided response (redirect or next).
 * `getUser` でリフレッシュし、指定レスポンス（redirect / next）に Set-Cookie を載せる。
 */
export async function finalizeSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // WEBAUTHN FIX: Skip redirect to prevent infinite loops
  // Domain consistency is now handled by RP ID logic only

  const env = getSupabaseEnv();

  if (!env) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          response.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedPath(request.nextUrl.pathname)) {
    const isVerified = isTwoFactorVerified(request, user.id);
    if (!isVerified) {
      const locale = resolveLocaleFromPathname(request.nextUrl.pathname);
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}/auth/2fa`;
      redirectUrl.search = "";
      redirectUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
