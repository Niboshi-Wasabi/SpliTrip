import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import {
  LINE_OAUTH_NONCE_COOKIE,
  LINE_OAUTH_RETURN_PATH_COOKIE,
  LINE_OAUTH_STATE_COOKIE,
} from "@/lib/line-oauth-cookie-names";

export type LineOAuthCookieBundle = {
  stateFromCookie: string | undefined;
  nonceFromCookie: string | undefined;
  returnPathFromCookie: string | undefined;
};

export function readLineOAuthCookies(
  request: NextRequest,
): LineOAuthCookieBundle {
  return {
    stateFromCookie: request.cookies.get(LINE_OAUTH_STATE_COOKIE)?.value,
    nonceFromCookie: request.cookies.get(LINE_OAUTH_NONCE_COOKIE)?.value,
    returnPathFromCookie: request.cookies.get(
      LINE_OAUTH_RETURN_PATH_COOKIE,
    )?.value,
  };
}

/** Tamper check for OAuth `state` (avoid timingSafeEqual on length mismatch). */
export function constantTimeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function isOAuthStateValid(
  cookies: LineOAuthCookieBundle,
  stateFromQuery: string,
): boolean {
  if (!cookies.stateFromCookie) return false;
  return constantTimeEqualString(cookies.stateFromCookie, stateFromQuery);
}

/**
 * `/api/auth/line` always sends `nonce`; match `id_token.nonce` to the cookie.
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
