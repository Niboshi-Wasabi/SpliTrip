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
 *
 * `request.cookies.getAll()` から Cookie ヘッダーを組み直すと、値のエンコーディングや分割 Cookie
 * の扱いで Supabase セッションが欠落することがあるため、生の `Cookie` から `NEXT_LOCALE` 行だけを差し替える。
 */
function withLocaleCookie(
  request: NextRequest,
  locale: (typeof routing.locales)[number],
): NextRequest {
  const name = NEXT_INTL_LOCALE_COOKIE_NAME;
  const raw = request.headers.get("cookie") ?? "";
  const kept = raw
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (part.length === 0) return false;
      const eq = part.indexOf("=");
      if (eq <= 0) return true;
      const segmentName = part.slice(0, eq).trim();
      return segmentName !== name;
    });
  const assignment = `${name}=${locale}`;
  const nextCookie =
    kept.length > 0 ? `${kept.join("; ")}; ${assignment}` : assignment;
  const headers = new Headers(request.headers);
  headers.set("cookie", nextCookie);
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
