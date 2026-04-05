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
import { decodeJwtPayloadOrNull } from "@/lib/decode-jwt-payload";
import { clearLineOAuthCookies } from "@/lib/line-oauth-cookies";
import { localizedDashboardPathFromRequest } from "@/lib/i18n/locale-from-request";
import { upsertUserProfileFromAuth } from "@/lib/user-profile";
import { getLineOAuthEnv } from "@/utils/line-oauth-env";
import { getSupabaseEnv } from "@/utils/supabase/env";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { isTurnstileConfigured } from "@/utils/turnstile-env";

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

  if (!isOAuthStateValid(cookies, state)) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  if (isTurnstileConfigured() && !cookies.captchaTokenFromCookie) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.CAPTCHA_REQUIRED);
  }

  const tokenResult = await exchangeLineAuthorizationCode(code, lineEnv);
  if (!tokenResult.ok) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const { idToken, accessToken } = tokenResult;

  const idPayload = decodeJwtPayloadOrNull(idToken);
  if (!idPayload) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const nonceCookie = cookies.nonceFromCookie;
  if (!nonceCookie || !isOpenIdNonceValid(idPayload, nonceCookie)) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const response = NextResponse.redirect(
    `${origin}${localizedDashboardPathFromRequest(request)}`,
  );
  clearLineOAuthCookies(response);

  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return redirectLineOAuthFailed(origin, AUTH_ERROR.AUTH);
  }

  const captcha = cookies.captchaTokenFromCookie;
  const { data, error: signInError } = await supabase.auth.signInWithIdToken({
    provider: "custom:line",
    token: idToken,
    ...(accessToken ? { access_token: accessToken } : {}),
    nonce: nonceCookie,
    ...(captcha ? { options: { captchaToken: captcha } } : {}),
  });

  if (signInError || !data.user) {
    console.error("signInWithIdToken (custom:line):", signInError?.message);
    return redirectLineOAuthFailed(origin, AUTH_ERROR.LINE_AUTH);
  }

  const overrides = profileOverridesFromLineIdToken(idPayload);
  await upsertUserProfileFromAuth(supabase, data.user, overrides);

  return response;
}
