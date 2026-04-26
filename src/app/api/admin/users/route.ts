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

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[API/Action Error - admin users is_admin]:", profileError);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  if (profile?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
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