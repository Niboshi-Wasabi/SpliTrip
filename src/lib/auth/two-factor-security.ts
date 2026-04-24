import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_FAILURES = 5;

type TwoFactorAction =
  | "register_verify"
  | "authenticate_verify"
  | "backup_verify"
  | "backup_regenerate"
  | "admin_stepup_verify"
  | "admin_stepup_success";

export function getRequestIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return "unknown";
}

export async function logTwoFactorSecurityEvent(
  supabase: SupabaseClient,
  payload: {
    userId: string;
    action: TwoFactorAction;
    success: boolean;
    ipAddress: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("two_factor_security_events").insert({
    user_id: payload.userId,
    action: payload.action,
    success: payload.success,
    ip_address: payload.ipAddress,
    metadata: payload.metadata ?? {},
  });
  if (error) {
    console.error("[API/Action Error - logTwoFactorSecurityEvent]:", error);
  }
}

export async function enforceTwoFactorRateLimit(
  supabase: SupabaseClient,
  payload: {
    userId: string;
    action: TwoFactorAction;
    ipAddress: string;
  },
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const sinceIso = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error } = await supabase
    .from("two_factor_security_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", payload.userId)
    .eq("action", payload.action)
    .eq("success", false)
    .eq("ip_address", payload.ipAddress)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("[API/Action Error - enforceTwoFactorRateLimit]:", error);
    return { allowed: true };
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_FAILURES) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_MINUTES * 60 };
  }

  return { allowed: true };
}
