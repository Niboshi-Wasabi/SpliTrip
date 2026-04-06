import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ERROR } from "@/lib/auth/auth-error-codes";
import { redirectLineOAuthFailed } from "@/lib/auth/auth-redirects";
import { exchangeLineAuthorizationCode } from "@/lib/auth/exchange-line-token";
import {
  isOAuthStateValid,
  isOpenIdNonceValid,
  profileOverridesFromLineIdToken,
  readLineOAuthCookies,
} from "@/lib/auth/line-callback-helpers";
import { establishSupabaseSessionFromLineVerifyPayload } from "@/lib/auth/line-web-session";
import { verifyLineIdTokenAtLineApi } from "@/lib/auth/verify-line-id-token-at-line";
import { decodeJwtPayloadOrNull } from "@/lib/decode-jwt-payload";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { clearLineOAuthCookies } from "@/lib/line-oauth-cookies";
import { localizedDashboardPathFromRequest } from "@/lib/i18n/locale-from-request";
import { upsertUserProfileFromAuth } from "@/lib/user-profile";
import { getLineOAuthEnv } from "@/utils/line-oauth-env";
import { getSupabaseEnv } from "@/utils/supabase/env";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (url.searchParams.get("error")) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const lineEnv = getLineOAuthEnv();
  if (!getSupabaseEnv() || !lineEnv) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_CONFIG);
  }

  const cookies = readLineOAuthCookies(request);
  const postAuthPath =
    sanitizeRedirectPath(cookies.returnPathFromCookie) ??
    localizedDashboardPathFromRequest(request);

  if (!isOAuthStateValid(cookies, state)) {
    console.error(
      "LINE callback: OAuth state invalid or missing cookie (reload / other tab / cookie blocked?)",
    );
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const tokenResult = await exchangeLineAuthorizationCode(code, lineEnv);
  if (!tokenResult.ok) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const { idToken } = tokenResult;

  const idPayload = decodeJwtPayloadOrNull(idToken);
  if (!idPayload) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const nonceCookie = cookies.nonceFromCookie;
  if (!nonceCookie || !isOpenIdNonceValid(idPayload, nonceCookie)) {
    console.error(
      "LINE callback: OpenID nonce invalid or missing (id_token vs cookie)",
    );
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const response = NextResponse.redirect(`${origin}${postAuthPath}`);
  clearLineOAuthCookies(response);

  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.AUTH);
  }

  const verified = await verifyLineIdTokenAtLineApi(idToken, lineEnv.channelId);
  if (!verified.ok) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const sessionResult = await establishSupabaseSessionFromLineVerifyPayload(
    verified.payload,
    lineEnv.redirectUri,
    postAuthPath,
    origin,
    supabase,
  );

  if (!sessionResult.ok) {
    console.error("LINE web session:", sessionResult.message);
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const overrides = profileOverridesFromLineIdToken(verified.payload);
  await upsertUserProfileFromAuth(supabase, user, overrides);

  return response;
}
