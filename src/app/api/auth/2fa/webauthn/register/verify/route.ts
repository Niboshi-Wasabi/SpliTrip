import {
  type RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  clearTwoFactorChallengeCookie,
  createBackupCodeList,
  getWebAuthnOrigin,
  getWebAuthnRpId,
  hashBackupCode,
  readTwoFactorChallengeCookie,
  writeTwoFactorVerifiedCookie,
} from "@/lib/auth/two-factor";
import {
  enforceTwoFactorRateLimit,
  getRequestIpAddress,
  logTwoFactorSecurityEvent,
} from "@/lib/auth/two-factor-security";
import { forwardSetCookieHeaders } from "@/lib/http/forward-set-cookie-headers";

type VerifyRegistrationRequestBody = {
  response?: RegistrationResponseJSON;
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
    action: "register_verify",
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

  let body: VerifyRegistrationRequestBody;
  try {
    body = (await request.json()) as VerifyRegistrationRequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.response) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "missing_response" },
    });
    return NextResponse.json(
      { ok: false, message: "Missing registration response" },
      { status: 400 },
    );
  }

  const challengePayload = readTwoFactorChallengeCookie(request);
  if (
    !challengePayload ||
    challengePayload.type !== "registration" ||
    challengePayload.userId !== user.id
  ) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "challenge_missing_or_expired" },
    });
    return NextResponse.json(
      { ok: false, message: "Registration challenge missing or expired" },
      { status: 400 },
    );
  }

  const origin = getWebAuthnOrigin(request);
  const rpID = getWebAuthnRpId(origin);
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challengePayload.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "verification_failed" },
    });
    return NextResponse.json({ ok: false, message: "Registration verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const credentialPublicKey = Buffer.from(credential.publicKey).toString("base64url");
  const transports = body.response.response.transports ?? [];

  const { error: credentialError } = await supabase
    .from("user_webauthn_credentials")
    .upsert(
      {
        user_id: user.id,
        credential_id: credential.id,
        public_key: credentialPublicKey,
        counter: credential.counter,
        transports,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "credential_id" },
    );

  if (credentialError) {
    console.error("[API/Action Error - 2FA register credential upsert]:", credentialError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "credential_persist_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to persist credential" }, { status: 500 });
  }

  const backupCodes = createBackupCodeList();
  const backupRows = backupCodes.map((code) => ({
    user_id: user.id,
    code_hash: hashBackupCode(code),
  }));

  await supabase.from("user_backup_codes").delete().eq("user_id", user.id);
  const { error: backupInsertError } = await supabase
    .from("user_backup_codes")
    .insert(backupRows);
  if (backupInsertError) {
    console.error("[API/Action Error - 2FA register backup code insert]:", backupInsertError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "backup_insert_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to create backup codes" }, { status: 500 });
  }

  const { error: profileUpdateError } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, two_factor_enabled: true }, { onConflict: "id" });
  if (profileUpdateError) {
    console.error("[API/Action Error - 2FA register profile upsert]:", profileUpdateError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "register_verify",
      success: false,
      ipAddress,
      metadata: { reason: "profile_update_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to enable 2FA profile flag" }, { status: 500 });
  }

  await logTwoFactorSecurityEvent(supabase, {
    userId: user.id,
    action: "register_verify",
    success: true,
    ipAddress,
  });
  const out = NextResponse.json({ ok: true, backupCodes });
  clearTwoFactorChallengeCookie(out);
  writeTwoFactorVerifiedCookie(out, user.id);
  forwardSetCookieHeaders(response, out);
  return out;
}
