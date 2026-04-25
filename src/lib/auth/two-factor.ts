import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const TWO_FACTOR_CHALLENGE_COOKIE = "splitrip_2fa_challenge";
const TWO_FACTOR_VERIFIED_COOKIE = "splitrip_2fa_verified";
const TWO_FACTOR_COOKIE_TTL_SECONDS = 60 * 60 * 12;
const CHALLENGE_TTL_SECONDS = 60 * 5;

type TwoFactorChallengeType = "registration" | "authentication";

type TwoFactorChallengePayload = {
  type: TwoFactorChallengeType;
  userId: string;
  challenge: string;
  expiresAt: number;
};

type TwoFactorVerifiedPayload = {
  userId: string;
  nonce: string;
  expiresAt: number;
};

function getTwoFactorSecret(): string {
  const explicitSecret = (process.env.TWO_FACTOR_SESSION_SECRET ?? "").trim();
  if (explicitSecret.length > 0) {
    return explicitSecret;
  }

  const serviceRoleSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (serviceRoleSecret.length > 0) {
    return serviceRoleSecret;
  }

  const lineSecret = (process.env.LINE_CHANNEL_SECRET ?? "").trim();
  if (lineSecret.length > 0) {
    return lineSecret;
  }

  throw new Error("TWO_FACTOR_SESSION_SECRET is not configured.");
}

function signPayload(base64Data: string): string {
  return createHmac("sha256", getTwoFactorSecret())
    .update(base64Data)
    .digest("base64url");
}

function encodeSignedPayload<T>(payload: T): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${signPayload(data)}`;
}

function decodeSignedPayload<T>(encoded: string): T | null {
  const [data, signature] = encoded.split(".");
  if (!data || !signature) {
    return null;
  }

  const expectedSignature = signPayload(data);
  if (expectedSignature.length !== signature.length) {
    return null;
  }

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function createBackupCodeList(count = 10): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}

export function hashBackupCode(rawCode: string): string {
  return createHash("sha256").update(rawCode).digest("hex");
}

export function writeTwoFactorChallengeCookie(
  response: NextResponse,
  payload: {
    type: TwoFactorChallengeType;
    userId: string;
    challenge: string;
  },
): void {
  const expiresAt = nowEpochSeconds() + CHALLENGE_TTL_SECONDS;
  const signed = encodeSignedPayload<TwoFactorChallengePayload>({
    ...payload,
    expiresAt,
  });
  response.cookies.set(TWO_FACTOR_CHALLENGE_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export function readTwoFactorChallengeCookie(
  request: NextRequest,
): TwoFactorChallengePayload | null {
  const raw = request.cookies.get(TWO_FACTOR_CHALLENGE_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const payload = decodeSignedPayload<TwoFactorChallengePayload>(raw);
  if (!payload) {
    return null;
  }
  if (payload.expiresAt < nowEpochSeconds()) {
    return null;
  }
  return payload;
}

export function clearTwoFactorChallengeCookie(response: NextResponse): void {
  response.cookies.set(TWO_FACTOR_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function writeTwoFactorVerifiedCookie(
  response: NextResponse,
  userId: string,
): void {
  const expiresAt = nowEpochSeconds() + TWO_FACTOR_COOKIE_TTL_SECONDS;
  const signed = encodeSignedPayload<TwoFactorVerifiedPayload>({
    userId,
    nonce: randomBytes(12).toString("base64url"),
    expiresAt,
  });
  response.cookies.set(TWO_FACTOR_VERIFIED_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TWO_FACTOR_COOKIE_TTL_SECONDS,
  });
}

export function clearTwoFactorVerifiedCookie(response: NextResponse): void {
  response.cookies.set(TWO_FACTOR_VERIFIED_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isTwoFactorVerified(request: NextRequest, userId: string): boolean {
  const raw = request.cookies.get(TWO_FACTOR_VERIFIED_COOKIE)?.value;
  if (!raw) {
    return false;
  }
  const payload = decodeSignedPayload<TwoFactorVerifiedPayload>(raw);
  if (!payload) {
    return false;
  }
  if (payload.expiresAt < nowEpochSeconds()) {
    return false;
  }
  return payload.userId === userId;
}

export function getWebAuthnOrigin(request: NextRequest): string {
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export function getWebAuthnRpId(origin: string): string {
  const hostname = new URL(origin).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return hostname;
  }

  // CRITICAL FIX: Always use the current hostname to ensure RP ID matches origin.
  // WebAuthn requires RP ID to be the same as or a parent of origin's hostname.
  // Environment variable override disabled to prevent origin/rpId mismatches.
  return hostname;
}

// ---------------------------------------------------------------------------
// Admin Step-Up（管理画面専用の短寿命 WebAuthn 再認証）
// 2FA 用の encode/decode / HMAC と同じ仕組みを再利用。Cookie 名のみ分離。
// Reuses the same signed-cookie machinery as 2FA; separate cookie names.
// ---------------------------------------------------------------------------

const ADMIN_STEPUP_CHALLENGE_COOKIE = "splitrip_admin_stepup_challenge";
/** リクエスト仕様の名前: HttpOnly / Secure / SameSite=Lax */
export const ADMIN_STEPUP_VERIFIED_COOKIE_NAME = "admin_stepup_verified";

const ADMIN_STEPUP_CHALLENGE_TTL_SECONDS = 60 * 5;
/** 管理画面 Step-Up: 直近 15 分以内のパスキー認証を要求 */
const ADMIN_STEPUP_VERIFIED_TTL_SECONDS = 60 * 15;

type AdminStepUpChallengePayload = {
  userId: string;
  challenge: string;
  expiresAt: number;
};

type AdminStepUpVerifiedPayload = {
  userId: string;
  nonce: string;
  expiresAt: number;
};

export function writeAdminStepUpChallengeCookie(
  response: NextResponse,
  payload: { userId: string; challenge: string },
): void {
  const expiresAt = nowEpochSeconds() + ADMIN_STEPUP_CHALLENGE_TTL_SECONDS;
  const signed = encodeSignedPayload<AdminStepUpChallengePayload>({
    ...payload,
    expiresAt,
  });
  response.cookies.set(ADMIN_STEPUP_CHALLENGE_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_STEPUP_CHALLENGE_TTL_SECONDS,
  });
}

export function readAdminStepUpChallengeCookie(
  request: NextRequest,
): AdminStepUpChallengePayload | null {
  const raw = request.cookies.get(ADMIN_STEPUP_CHALLENGE_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const payload = decodeSignedPayload<AdminStepUpChallengePayload>(raw);
  if (!payload) {
    return null;
  }
  if (payload.expiresAt < nowEpochSeconds()) {
    return null;
  }
  return payload;
}

export function clearAdminStepUpChallengeCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_STEPUP_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function writeAdminStepUpVerifiedCookie(
  response: NextResponse,
  userId: string,
): void {
  const expiresAt = nowEpochSeconds() + ADMIN_STEPUP_VERIFIED_TTL_SECONDS;
  const signed = encodeSignedPayload<AdminStepUpVerifiedPayload>({
    userId,
    nonce: randomBytes(12).toString("base64url"),
    expiresAt,
  });
  response.cookies.set(ADMIN_STEPUP_VERIFIED_COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_STEPUP_VERIFIED_TTL_SECONDS,
  });
}

export function clearAdminStepUpVerifiedCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_STEPUP_VERIFIED_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isAdminStepUpVerified(
  request: NextRequest,
  userId: string,
): boolean {
  const raw = request.cookies.get(ADMIN_STEPUP_VERIFIED_COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }
  const payload = decodeSignedPayload<AdminStepUpVerifiedPayload>(raw);
  if (!payload) {
    return false;
  }
  if (payload.expiresAt < nowEpochSeconds()) {
    return false;
  }
  return payload.userId === userId;
}
