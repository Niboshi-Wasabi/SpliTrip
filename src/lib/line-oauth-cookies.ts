import { NextResponse } from "next/server";
import {
  LINE_CAPTCHA_BRIDGE_COOKIE,
  LINE_OAUTH_CAPTCHA_COOKIE,
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_RETURN_PATH_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
} from "@/lib/line-oauth-cookie-names";

export {
  LINE_CAPTCHA_BRIDGE_COOKIE,
  LINE_OAUTH_CAPTCHA_COOKIE,
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

/** 認可フロー開始時に state / nonce を載せる（短期） */
export function lineOAuthPendingCookieOptions() {
  return { ...lineOAuthCookieBase, maxAge: 600 };
}

export function lineOAuthCookieClearOptions() {
  return { ...lineOAuthCookieBase, maxAge: 0 };
}

/** 失敗時も成功時も、一時 Cookie を確実に消す */
export function clearLineOAuthCookies(response: NextResponse): void {
  const o = lineOAuthCookieClearOptions();
  response.cookies.set(LINE_OAUTH_STATE_COOKIE, "", o);
  response.cookies.set(LINE_OAUTH_NONCE_COOKIE, "", o);
  response.cookies.set(LINE_OAUTH_CAPTCHA_COOKIE, "", o);
  response.cookies.set(LINE_OAUTH_RETURN_PATH_COOKIE, "", o);
}

/** ブリッジ Cookie をサーバー応答で削除（httpOnly でないため path を合わせる） */
export function clearLineCaptchaBridgeCookie(response: NextResponse): void {
  response.cookies.set(LINE_CAPTCHA_BRIDGE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * LINE OAuth 用の一時 Cookie を消したうえでリダイレクトする（失敗パス用）。
 * path は先頭スラッシュ付き（例: "/?error=line_auth"）
 */
export function redirectClearingLineOAuthCookies(
  origin: string,
  path: string,
): NextResponse {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const response = NextResponse.redirect(`${origin}${normalized}`);
  clearLineOAuthCookies(response);
  clearLineCaptchaBridgeCookie(response);
  return response;
}
