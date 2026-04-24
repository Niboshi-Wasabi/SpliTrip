import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { isTwoFactorVerified } from "@/lib/auth/two-factor";
import { forwardSetCookieHeaders } from "@/lib/http/forward-set-cookie-headers";

export async function GET(request: NextRequest) {
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

  const [{ data: profile }, { count: credentialCount }, { count: backupCount }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("two_factor_enabled")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_webauthn_credentials")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id),
      supabase
        .from("user_backup_codes")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .is("used_at", null),
    ]);

  const out = NextResponse.json({
    ok: true,
    enabled: profile?.two_factor_enabled === true,
    credentialCount: credentialCount ?? 0,
    remainingBackupCodes: backupCount ?? 0,
    verified: isTwoFactorVerified(request, user.id),
  });
  forwardSetCookieHeaders(response, out);
  return out;
}
