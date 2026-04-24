import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { createBackupCodeList, hashBackupCode } from "@/lib/auth/two-factor";
import {
  getRequestIpAddress,
  logTwoFactorSecurityEvent,
} from "@/lib/auth/two-factor-security";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase unavailable" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ipAddress = getRequestIpAddress(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const backupCodes = createBackupCodeList();
  const backupRows = backupCodes.map((code) => ({
    user_id: user.id,
    code_hash: hashBackupCode(code),
  }));

  await supabase.from("user_backup_codes").delete().eq("user_id", user.id);
  const { error: insertError } = await supabase.from("user_backup_codes").insert(backupRows);
  if (insertError) {
    console.error("[API/Action Error - 2FA backup regenerate]:", insertError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "backup_regenerate",
      success: false,
      ipAddress,
      metadata: { reason: "insert_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to regenerate backup codes" }, { status: 500 });
  }

  await logTwoFactorSecurityEvent(supabase, {
    userId: user.id,
    action: "backup_regenerate",
    success: true,
    ipAddress,
  });
  return NextResponse.json({ ok: true, backupCodes });
}
