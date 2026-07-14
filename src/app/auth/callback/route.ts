import { NextRequest } from "next/server";
import { AUTH_ERROR } from "@/lib/auth/auth-error-codes";
import { redirectToLoginError } from "@/lib/auth/auth-redirects";
import {
  buildSameOriginPostAuthUrl,
  createAuthSessionBridgeResponse,
} from "@/lib/auth/auth-session-bridge";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { localizedDashboardPathFromRequest } from "@/lib/i18n/locale-from-request";
import { upsertUserProfileFromAuth } from "@/lib/user-profile";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { clearTwoFactorVerifiedCookie } from "@/lib/auth/two-factor";

/**
 * Google (etc.) PKCE callback: exchange code, set session cookies on a 200 HTML bridge,
 * then client-navigate. Avoids WebViews that drop Set-Cookie on 302 redirects.
 * Google 等の PKCE コールバック。コード交換後、302 ではなく 200 HTML ブリッジで Cookie を確定する。
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const fallbackPath = localizedDashboardPathFromRequest(request);
  const redirectPath =
    sanitizeRedirectPath(url.searchParams.get("next")) ?? fallbackPath;

  if (!code) {
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const absoluteRedirectUrl = buildSameOriginPostAuthUrl(
    origin,
    redirectPath,
    fallbackPath,
  );
  const response = createAuthSessionBridgeResponse(absoluteRedirectUrl);
  clearTwoFactorVerifiedCookie(response);
  const supabase = createRouteHandlerSupabaseClient(request, response);

  if (!supabase) {
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    console.error(
      "[API/Action Error - GET /auth/callback exchangeCodeForSession]:",
      exchangeError,
    );
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await upsertUserProfileFromAuth(supabase, user);
  }

  return response;
}
