import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/utils/supabase/env";

export async function GET() {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIsoTimestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("app_announcements")
    .select(
      "id, title_ja, title_en, content_ja, content_en, icon_type, priority, expires_at, created_at",
    )
    .eq("is_published", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIsoTimestamp}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[API/Action Error - GET /api/public/announcements/latest]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data ?? null });
}
