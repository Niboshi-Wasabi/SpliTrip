/**
 * 管理画面 Step-Up: WebAuthn 認証オプション。
 * 2FA の `authenticate/options` と同じ generateAuthenticationOptions だが、
 * チャレンジは専用 Cookie（splitrip_admin_stepup_challenge）に保存する。
 * Same as 2FA auth options, but uses admin step-up challenge cookie.
 */
import {
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  writeAdminStepUpChallengeCookie,
} from "@/lib/auth/two-factor";

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
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[API/Action Error - admin webauthn-options is_admin]:", profileError);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }

  if (profile?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }

  const { data: credentials } = await supabase
    .from("user_webauthn_credentials")
    .select("credential_id,transports")
    .eq("user_id", user.id);

  if (!credentials || credentials.length === 0) {
    return NextResponse.json(
      { ok: false, message: "no_registered_authenticator", code: "NO_PASSKEY" },
      { status: 400 },
    );
  }

  const origin = getWebAuthnOrigin(request);
  const rpID = getWebAuthnRpId(origin);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({
      id: credential.credential_id,
      transports: (
        Array.isArray(credential.transports)
          ? credential.transports.filter((value): value is string => typeof value === "string")
          : []
      ) as AuthenticatorTransportFuture[],
    })),
  });

  const out = NextResponse.json({ ok: true, options });
  writeAdminStepUpChallengeCookie(out, {
    userId: user.id,
    challenge: options.challenge,
  });
  return out;
}
