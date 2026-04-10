/**
 * Injects next-intl's locale cookie from Supabase `user_profiles.preferred_language`
 * so middleware picks the same locale without a second negotiation pass.
 * Supabase の `preferred_language` を next-intl 用クッキーに載せ、ミドルウェアの判定と揃える。
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  isAppLocale,
  NEXT_INTL_LOCALE_COOKIE_NAME,
} from "@/lib/i18n/next-intl-locale";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Clones the request with an added or replaced locale cookie (Request cookie header).
 * ロケール Cookie を付け替えたリクエストを複製する。
 */
function withLocaleCookie(
  request: NextRequest,
  locale: (typeof routing.locales)[number],
): NextRequest {
  const jar = new Map<string, string>();
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name !== NEXT_INTL_LOCALE_COOKIE_NAME) {
      jar.set(cookie.name, cookie.value);
    }
  }
  jar.set(NEXT_INTL_LOCALE_COOKIE_NAME, locale);
  const cookieHeader = Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const headers = new Headers(request.headers);
  headers.set("cookie", cookieHeader);
  return new NextRequest(request.url, { headers, method: request.method });
}

/**
 * When a session exists, prefer `user_profiles.preferred_language` over browser negotiation.
 * セッションがある場合はブラウザ推測より `user_profiles.preferred_language` を優先する。
 *
 * @param request - Incoming request / 受信リクエスト
 * @returns Possibly modified request for downstream intl middleware / intl 用に加工したリクエスト
 */
export async function applyProfilePreferredLocaleCookie(
  request: NextRequest,
): Promise<NextRequest> {
  const env = getSupabaseEnv();
  if (!env) {
    return request;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {
        /* read-only pass / 読み取りのみ */
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return request;
  }

  const { data: langResult } = await supabase.rpc("get_own_preferred_language");

  const raw =
    typeof langResult === "string" && langResult.length > 0
      ? langResult
      : routing.defaultLocale;

  if (!isAppLocale(raw)) {
    return request;
  }

  return withLocaleCookie(request, raw);
}
