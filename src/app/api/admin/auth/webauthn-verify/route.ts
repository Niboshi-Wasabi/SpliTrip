/**
 * 管理画面 Step-Up: WebAuthn 認証検証 + admin_stepup_verified Cookie 付与。
 * ロジックは `api/auth/2fa/webauthn/authenticate/verify` を踏襲（verifyAuthenticationResponse、カウンタ更新）。
 * Mirrors 2FA authenticate/verify; uses readAdminStepUpChallengeCookie and admin audit action.
 */
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  clearAdminStepUpChallengeCookie,
  getWebAuthnOrigin,
  getWebAuthnRpId,
  readAdminStepUpChallengeCookie,
  writeAdminStepUpVerifiedCookie,
} from "@/lib/auth/two-factor";
import {
  enforceTwoFactorRateLimit,
  getRequestIpAddress,
  logTwoFactorSecurityEvent,
} from "@/lib/auth/two-factor-security";
import { forwardSetCookieHeaders } from "@/lib/http/forward-set-cookie-headers";

type Body = { response?: AuthenticationResponseJSON };

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase unavailable" },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ipAddress = getRequestIpAddress(request);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceTwoFactorRateLimit(supabase, {
    userId: user.id,
    action: "admin_stepup_verify",
    ipAddress,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[API/Action Error - admin webauthn-verify is_admin]:", profileError);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }

  if (profile?.is_admin !== true) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "not_admin" },
    });
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.response) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "missing_response" },
    });
    return NextResponse.json({ ok: false, message: "Missing response" }, { status: 400 });
  }

  const challengePayload = readAdminStepUpChallengeCookie(request);
  if (!challengePayload || challengePayload.userId !== user.id) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "challenge_missing_or_expired" },
    });
    return NextResponse.json(
      { ok: false, message: "Challenge missing or expired" },
      { status: 400 },
    );
  }

  const { data: credentialRow } = await supabase
    .from("user_webauthn_credentials")
    .select("credential_id,public_key,counter,transports")
    .eq("user_id", user.id)
    .eq("credential_id", body.response.id)
    .maybeSingle();

  if (!credentialRow) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "unknown_credential" },
    });
    return NextResponse.json({ ok: false, message: "Unknown authenticator" }, { status: 400 });
  }

  const origin = getWebAuthnOrigin(request);
  const rpID = getWebAuthnRpId(origin);
  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge: challengePayload.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credentialRow.credential_id,
      publicKey: Buffer.from(credentialRow.public_key, "base64url"),
      counter: credentialRow.counter,
      transports: (
        Array.isArray(credentialRow.transports)
          ? credentialRow.transports.filter((value): value is string => typeof value === "string")
          : []
      ) as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "verification_failed" },
    });
    return NextResponse.json(
      { ok: false, message: "Authentication verification failed" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("user_webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("credential_id", credentialRow.credential_id);

  if (updateError) {
    console.error(
      "[API/Action Error - admin step-up update credential counter]:",
      updateError,
    );
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "admin_stepup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "credential_update_failed" },
    });
    return NextResponse.json(
      { ok: false, message: "Failed to update credential" },
      { status: 500 },
    );
  }

  await logTwoFactorSecurityEvent(supabase, {
    userId: user.id,
    action: "admin_stepup_success",
    success: true,
    ipAddress,
    metadata: { context: "admin_step_up" },
  });

  const out = NextResponse.json({ 
    ok: true,
    message: "Authentication successful",
    userId: user.id,
    timestamp: new Date().toISOString()
  });
  forwardSetCookieHeaders(response, out);
  clearAdminStepUpChallengeCookie(out);
  writeAdminStepUpVerifiedCookie(out, user.id);
  
  // デバッグ用ログ
  console.log("[AdminWebAuthnVerify] 認証成功:", {
    userId: user.id,
    nextUrl: request.nextUrl.pathname
  });
  
  return out;
}
