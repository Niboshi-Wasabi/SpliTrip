/**
 * Composes next-intl locale routing with Supabase session refresh.
 * next-intl のロケール処理と Supabase セッション更新を合成する。
 */
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { applyAccessBasedLocaleHint } from "./lib/i18n/infer-locale-from-access";
import { applyProfilePreferredLocaleCookie } from "./lib/i18n/profile-locale-cookie";
import { finalizeSupabaseSession } from "./utils/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // OAuth callback must stay on a fixed path (no locale segment). / OAuth は固定パスのままにする。
  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) {
    return finalizeSupabaseSession(
      request,
      NextResponse.next({ request }),
    );
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
