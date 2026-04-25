import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

/**
 * ユーザー設定取得API
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

  try {
    // ユーザー設定データを取得
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        display_name,
        avatar_url,
        preferred_locale,
        premium_access,
        premium_access_source,
        is_admin,
        payment_bank_name,
        payment_account_type,
        payment_account_number,
        payment_account_holder,
        two_factor_enabled
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[API Error - settings profile]:", profileError);
      return NextResponse.json({ ok: false, message: "profile_error" }, { status: 500 });
    }

    const successResponse = NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile
    });
    
    // 設定データは1分間キャッシュ
    successResponse.headers.set('Cache-Control', 'private, max-age=60, s-maxage=60');
    return successResponse;

  } catch (error) {
    console.error("[API Error - settings]:", error);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
}