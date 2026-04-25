import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { listAdminUsers } from "@/lib/admin/list-admin-users";

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

  try {
    const { items, totalCount } = await listAdminUsers();
    const out = NextResponse.json({
      ok: true,
      items,
      totalCount,
    });
    
    // 管理画面データは短時間キャッシュ
    out.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return out;
  } catch (error) {
    console.error("[API/Action Error - admin users list]:", error);
    return NextResponse.json({ 
      ok: false, 
      message: "server_error" 
    }, { status: 500 });
  }
}