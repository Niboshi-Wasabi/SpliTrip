import {
  type AuthenticatorTransportFuture,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  writeTwoFactorChallengeCookie,
} from "@/lib/auth/two-factor";

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

  const { data: credentials } = await supabase
    .from("user_webauthn_credentials")
    .select("credential_id,transports")
    .eq("user_id", user.id);

  const origin = getWebAuthnOrigin(request);
  const rpID = getWebAuthnRpId(origin);
  const options = await generateRegistrationOptions({
    rpName: "SpliTrip",
    rpID,
    userName: user.email ?? `user-${user.id}`,
    userDisplayName: user.user_metadata?.full_name ?? user.email ?? "SpliTrip User",
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    excludeCredentials:
      credentials?.map((credential) => ({
        id: credential.credential_id,
        transports: (
          Array.isArray(credential.transports)
            ? credential.transports.filter((value): value is string => typeof value === "string")
            : []
        ) as AuthenticatorTransportFuture[],
      })) ?? [],
  });

  const out = NextResponse.json({ ok: true, options });
  writeTwoFactorChallengeCookie(out, {
    type: "registration",
    userId: user.id,
    challenge: options.challenge,
  });
  return out;
}
