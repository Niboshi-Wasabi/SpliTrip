import { NextResponse } from "next/server";
import {
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_RETURN_PATH_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
} from "@/lib/line-oauth-cookie-names";

export {
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_RETURN_PATH_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
} from "@/lib/line-oauth-cookie-names";

const lineOAuthCookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Short-lived cookies when starting the LINE authorize redirect. */
export function lineOAuthPendingCookieOptions() {
  return { ...lineOAuthCookieBase, maxAge: 600 };
}

export function lineOAuthCookieClearOptions() {
  return { ...lineOAuthCookieBase, maxAge: 0 };
}

/** Clear temporary LINE OAuth cookies on success or failure. */
export function clearLineOAuthCookies(response: NextResponse): void {
  const options = lineOAuthCookieClearOptions();
  response.cookies.set(LINE_OAUTH_STATE_COOKIE, "", options);
  response.cookies.set(LINE_OAUTH_NONCE_COOKIE, "", options);
  response.cookies.set(LINE_OAUTH_RETURN_PATH_COOKIE, "", options);
}

/**
 * Redirect and clear LINE OAuth cookies (failure paths).
 * path は先頭スラッシュ付き（例: "/?error=line_auth"）
 */
export function redirectClearingLineOAuthCookies(
  origin: string,
  path: string,
): NextResponse {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const response = NextResponse.redirect(`${origin}${normalized}`);
  clearLineOAuthCookies(response);
  return response;
}
