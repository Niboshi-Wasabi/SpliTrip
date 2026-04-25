import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

/**
 * ユーザープロフィール取得API
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  // ユーザープロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[API Error - profile]:", profileError);
    return NextResponse.json({ ok: false, message: "profile_error" }, { status: 500 });
  }

  const successResponse = NextResponse.json({ 
    ok: true, 
    user,
    profile 
  });
  
  // 短いキャッシュで最新性を保つ
  successResponse.headers.set('Cache-Control', 'private, max-age=60, s-maxage=60');
  return successResponse;
}