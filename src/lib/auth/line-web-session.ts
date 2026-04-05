import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/utils/supabase/env";

function syntheticLineEmail(sub: string, redirectUri: string): string {
  const host = new URL(redirectUri).hostname;
  const safe = sub.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `line_${safe}@${host}`;
}

function lineEmailFromVerifyPayload(
  payload: Record<string, unknown>,
  redirectUri: string,
): string {
  const email =
    typeof payload.email === "string" ? payload.email.trim() : "";
  if (email.length > 0) return email;

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  return syntheticLineEmail(sub, redirectUri);
}

/**
 * Web の LINE id_token（HS256）向け: LINE 公式 verify で検証済みのペイロードから、
 * サービスロールでユーザーを用意し magic link 相当の verifyOtp で Cookie セッションを付与する。
 */
export async function establishSupabaseSessionFromLineVerifyPayload(
  linePayload: Record<string, unknown>,
  redirectUri: string,
  dashboardRedirectPath: string,
  origin: string,
  supabaseUserClient: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) {
    console.error(
      "LINE web session: SUPABASE_SERVICE_ROLE_KEY is not set (required for HS256 LINE web tokens)",
    );
    return {
      ok: false,
      message:
        "SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercel にサービスロールキーを設定してください。",
    };
  }

  const env = getSupabaseEnv();
  if (!env) {
    return { ok: false, message: "Supabase env missing" };
  }

  const admin = createClient(env.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = lineEmailFromVerifyPayload(linePayload, redirectUri);
  const sub = typeof linePayload.sub === "string" ? linePayload.sub : "";
  const displayName =
    typeof linePayload.name === "string" ? linePayload.name : undefined;
  const picture =
    typeof linePayload.picture === "string" ? linePayload.picture : undefined;

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      line_sub: sub,
      ...(displayName ? { full_name: displayName } : {}),
      ...(picture ? { picture, avatar_url: picture } : {}),
    },
  });

  if (createErr && createErr.code !== "email_exists") {
    console.error("LINE web session: admin.createUser", createErr);
    return { ok: false, message: createErr.message };
  }

  const dashboardUrl = `${origin}${dashboardRedirectPath.startsWith("/") ? dashboardRedirectPath : `/${dashboardRedirectPath}`}`;

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: dashboardUrl },
    });

  const hashed = linkData?.properties?.hashed_token;
  if (linkErr || !hashed) {
    console.error("LINE web session: admin.generateLink", linkErr);
    return {
      ok: false,
      message: linkErr?.message ?? "generateLink failed",
    };
  }

  const { error: voErr, data: sessionData } =
    await supabaseUserClient.auth.verifyOtp({
      token_hash: hashed,
      type: "magiclink",
    });

  if (voErr || !sessionData.session?.user) {
    console.error("LINE web session: verifyOtp", voErr);
    return {
      ok: false,
      message: voErr?.message ?? "verifyOtp failed",
    };
  }

  return { ok: true };
}
