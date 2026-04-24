import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  clearTwoFactorChallengeCookie,
  getWebAuthnOrigin,
  getWebAuthnRpId,
  readTwoFactorChallengeCookie,
  writeTwoFactorVerifiedCookie,
} from "@/lib/auth/two-factor";
import {
  enforceTwoFactorRateLimit,
  getRequestIpAddress,
  logTwoFactorSecurityEvent,
} from "@/lib/auth/two-factor-security";

type VerifyAuthenticationRequestBody = {
  response?: AuthenticationResponseJSON;
};

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase unavailable" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const ipAddress = getRequestIpAddress(request);
  const rateLimit = await enforceTwoFactorRateLimit(supabase, {
    userId: user.id,
    action: "authenticate_verify",
    ipAddress,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please retry later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: VerifyAuthenticationRequestBody;
  try {
    body = (await request.json()) as VerifyAuthenticationRequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.response) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "authenticate_verify",
      success: false,
      ipAddress,
      metadata: { reason: "missing_response" },
    });
    return NextResponse.json(
      { ok: false, message: "Missing authentication response" },
      { status: 400 },
    );
  }

  const challengePayload = readTwoFactorChallengeCookie(request);
  if (
    !challengePayload ||
    challengePayload.type !== "authentication" ||
    challengePayload.userId !== user.id
  ) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "authenticate_verify",
      success: false,
      ipAddress,
      metadata: { reason: "challenge_missing_or_expired" },
    });
    return NextResponse.json(
      { ok: false, message: "Authentication challenge missing or expired" },
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
      action: "authenticate_verify",
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
      action: "authenticate_verify",
      success: false,
      ipAddress,
      metadata: { reason: "verification_failed" },
    });
    return NextResponse.json({ ok: false, message: "Authentication verification failed" }, { status: 400 });
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
    console.error("[API/Action Error - 2FA update credential counter]:", updateError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "authenticate_verify",
      success: false,
      ipAddress,
      metadata: { reason: "credential_update_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to update credential" }, { status: 500 });
  }

  await logTwoFactorSecurityEvent(supabase, {
    userId: user.id,
    action: "authenticate_verify",
    success: true,
    ipAddress,
  });
  const out = NextResponse.json({ ok: true });
  clearTwoFactorChallengeCookie(out);
  writeTwoFactorVerifiedCookie(out, user.id);
  return out;
}
