import { NextResponse } from "next/server";
import { redirectClearingLineOAuthCookies } from "@/lib/line-oauth-cookies";
import {
  type AuthErrorCode,
  loginErrorPath,
} from "@/lib/auth/auth-error-codes";

/** Google PKCE など、LINE 一時 Cookie の消し込みが不要なログインエラー */
export function redirectToLoginError(
  origin: string,
  code: AuthErrorCode,
): NextResponse {
  return NextResponse.redirect(`${origin}${loginErrorPath(code)}`);
}

/** LINE OAuth コールバック失敗時（state / nonce 用 Cookie を確実に削除） */
export function redirectLineOAuthFailed(
  origin: string,
  code: AuthErrorCode,
): NextResponse {
  return redirectClearingLineOAuthCookies(origin, loginErrorPath(code));
}
