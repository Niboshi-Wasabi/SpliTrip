/**
 * Refresh Supabase session cookies on any proxied response; gate dashboard/settings when unauthenticated.
 * プロキシ経由のレスポンスへセッション Cookie を載せ替え、未認証時は dashboard/settings をブロックする。
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSupabaseEnv } from "./env";

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

/**
 * Runs `getUser` refresh and copies Set-Cookie onto the provided response (redirect or next).
 * `getUser` でリフレッシュし、指定レスポンス（redirect / next）に Set-Cookie を載せる。
 */
export async function finalizeSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
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

  return response;
}
