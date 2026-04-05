import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import {
  LINE_OAUTH_CAPTCHA_COOKIE,
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
} from "@/lib/line-oauth-cookie-names";

export type LineOAuthCookieBundle = {
  stateFromCookie: string | undefined;
  nonceFromCookie: string | undefined;
  captchaTokenFromCookie: string | undefined;
};

export function readLineOAuthCookies(
  request: NextRequest,
): LineOAuthCookieBundle {
  return {
    stateFromCookie: request.cookies.get(LINE_OAUTH_STATE_COOKIE)?.value,
    nonceFromCookie: request.cookies.get(LINE_OAUTH_NONCE_COOKIE)?.value,
    captchaTokenFromCookie: request.cookies
      .get(LINE_OAUTH_CAPTCHA_COOKIE)
      ?.value?.trim(),
  };
}

/** state の改ざん検知用（長さ不一致時は timingSafeEqual を呼ばない） */
export function constantTimeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isOAuthStateValid(
  cookies: LineOAuthCookieBundle,
  stateFromQuery: string,
): boolean {
  if (!cookies.stateFromCookie) return false;
  return constantTimeEqualString(cookies.stateFromCookie, stateFromQuery);
}

/**
 * /api/auth/line で常に nonce を付与しているため、id_token の nonce と Cookie を突き合わせる
 */
export function isOpenIdNonceValid(
  idTokenPayload: Record<string, unknown>,
  nonceFromCookie: string | undefined,
): boolean {
  if (!nonceFromCookie) return false;
  const nonceInToken =
    typeof idTokenPayload.nonce === "string" ? idTokenPayload.nonce : "";
  if (!nonceInToken) return false;
  return constantTimeEqualString(nonceInToken, nonceFromCookie);
}

export function profileOverridesFromLineIdToken(
  payload: Record<string, unknown>,
): {
  displayName?: string;
  avatarUrl?: string | null;
} {
  const name =
    typeof payload.name === "string" && payload.name.length > 0
      ? payload.name
      : undefined;
  const picture =
    typeof payload.picture === "string" && payload.picture.length > 0
      ? payload.picture
      : undefined;
  return {
    ...(name ? { displayName: name } : {}),
    ...(picture ? { avatarUrl: picture } : {}),
  };
}
