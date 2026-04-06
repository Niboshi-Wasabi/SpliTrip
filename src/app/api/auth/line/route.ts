import { randomBytes, randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR } from "@/lib/auth/auth-error-codes";
import { redirectToLoginError } from "@/lib/auth/auth-redirects";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import {
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_RETURN_PATH_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
  lineOAuthCookieClearOptions,
  lineOAuthPendingCookieOptions,
} from "@/lib/line-oauth-cookies";
import { getLineOAuthEnv } from "@/utils/line-oauth-env";

const LINE_AUTHORIZE_BASE = "https://access.line.me/oauth2/v2.1/authorize";

/**
 * Start LINE OAuth (no CAPTCHA pre-check — removed for smoother UX on all devices).
 * CAPTCHA 事前チェックは行わない（全デバイスで摩擦を減らすため撤去済み）。
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const lineEnv = getLineOAuthEnv();

  if (!lineEnv) {
    return redirectToLoginError(origin, AUTH_ERROR.LINE_CONFIG);
  }

  const state = randomUUID();
  const nonce = randomBytes(16).toString("base64url");
  const returnPath = sanitizeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  const authorizeQuery = new URLSearchParams({
    response_type: "code",
    client_id: lineEnv.channelId,
    redirect_uri: lineEnv.redirectUri,
    state,
    scope: "profile openid email",
    nonce,
  });

  const redirectToLine = NextResponse.redirect(
    `${LINE_AUTHORIZE_BASE}?${authorizeQuery.toString()}`,
  );

  const pending = lineOAuthPendingCookieOptions();
  redirectToLine.cookies.set(LINE_OAUTH_STATE_COOKIE, state, pending);
  redirectToLine.cookies.set(LINE_OAUTH_NONCE_COOKIE, nonce, pending);
  if (returnPath) {
    redirectToLine.cookies.set(LINE_OAUTH_RETURN_PATH_COOKIE, returnPath, pending);
  } else {
    redirectToLine.cookies.set(
      LINE_OAUTH_RETURN_PATH_COOKIE,
      "",
      lineOAuthCookieClearOptions(),
    );
  }

  return redirectToLine;
}
