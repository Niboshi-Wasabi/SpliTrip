import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { listAdminAuditLogs } from "@/lib/admin/list-admin-audit-logs";

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

  // 管理者権限の確認
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "50", 10)));

  try {
    const { logs, totalCount } = await listAdminAuditLogs({ page, limit });
    const out = NextResponse.json({
      ok: true,
      logs,
      totalCount,
      page,
      limit,
    });
    
    // 監査ログは短時間キャッシュ
    out.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return out;
  } catch (error) {
    console.error("[API/Action Error - admin audit logs]:", error);
    return NextResponse.json({ 
      ok: false, 
      message: "server_error" 
    }, { status: 500 });
  }
}