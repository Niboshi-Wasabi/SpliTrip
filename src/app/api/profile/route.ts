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

  // ユーザープロフィール取得（必要フィールドのみ）
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, preferred_locale, is_premium, stripe_customer_id, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[API Error - profile]:", profileError);
    return NextResponse.json({ ok: false, message: "profile_error" }, { status: 500 });
  }

  // ユーザー情報は必要最小限のフィールドのみ
  const safeUserData = {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  };

  const successResponse = NextResponse.json({ 
    ok: true, 
    user: safeUserData,
    profile 
  });
  
  // 短いキャッシュで最新性を保つ
  successResponse.headers.set('Cache-Control', 'private, max-age=60, s-maxage=60');
  return successResponse;
}