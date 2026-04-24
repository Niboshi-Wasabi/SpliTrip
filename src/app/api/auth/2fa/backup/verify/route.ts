import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { hashBackupCode, writeTwoFactorVerifiedCookie } from "@/lib/auth/two-factor";
import {
  enforceTwoFactorRateLimit,
  getRequestIpAddress,
  logTwoFactorSecurityEvent,
} from "@/lib/auth/two-factor-security";

type BackupVerifyRequestBody = {
  code?: string;
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
    action: "backup_verify",
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

  let body: BackupVerifyRequestBody;
  try {
    body = (await request.json()) as BackupVerifyRequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const rawCode = (body.code ?? "").trim();
  if (!rawCode) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "backup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "missing_code" },
    });
    return NextResponse.json({ ok: false, message: "Backup code is required" }, { status: 400 });
  }

  const hashedCode = hashBackupCode(rawCode);
  const { data: backupCodeRow } = await supabase
    .from("user_backup_codes")
    .select("id")
    .eq("user_id", user.id)
    .eq("code_hash", hashedCode)
    .is("used_at", null)
    .maybeSingle();

  if (!backupCodeRow) {
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "backup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "invalid_code" },
    });
    return NextResponse.json({ ok: false, message: "Backup code is invalid" }, { status: 400 });
  }

  const { error: consumeError } = await supabase
    .from("user_backup_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", backupCodeRow.id)
    .eq("user_id", user.id);

  if (consumeError) {
    console.error("[API/Action Error - 2FA backup consume]:", consumeError);
    await logTwoFactorSecurityEvent(supabase, {
      userId: user.id,
      action: "backup_verify",
      success: false,
      ipAddress,
      metadata: { reason: "consume_failed" },
    });
    return NextResponse.json({ ok: false, message: "Failed to consume backup code" }, { status: 500 });
  }

  await logTwoFactorSecurityEvent(supabase, {
    userId: user.id,
    action: "backup_verify",
    success: true,
    ipAddress,
  });
  const out = NextResponse.json({ ok: true });
  writeTwoFactorVerifiedCookie(out, user.id);
  return out;
}
