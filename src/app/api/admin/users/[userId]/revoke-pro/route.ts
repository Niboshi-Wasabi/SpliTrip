import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: targetUserId } = params;

    // 1. 呼び出し元のセッション検証
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[revoke-pro] 認証エラー:", authError);
      return NextResponse.json(
        { error: "認証が必要です" }, 
        { status: 401 }
      );
    }

    // 2. 管理者権限の確認
    const { data: adminProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      console.error("[revoke-pro] 管理者権限なし:", { 
        userId: user.id, 
        adminProfile,
        error: profileError 
      });
      return NextResponse.json(
        { error: "管理者権限が必要です" }, 
        { status: 403 }
      );
    }

    // 3. Service Role クライアントでPRO権限を取り消し
    const serviceSupabase = createServiceRoleClient();
    
    // 対象ユーザーの現在の状態を取得
    const { data: targetUser, error: targetUserError } = await serviceSupabase
      .from("user_profiles")
      .select("id, premium_access, premium_access_source")
      .eq("id", targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      console.error("[revoke-pro] 対象ユーザーが見つからない:", targetUserError);
      return NextResponse.json(
        { error: "対象ユーザーが見つかりません" }, 
        { status: 404 }
      );
    }

    // 既に無料ユーザーの場合
    if (!targetUser.premium_access) {
      return NextResponse.json(
        { message: "既に無料ユーザーです", alreadyFree: true }, 
        { status: 200 }
      );
    }

    // 4. PRO権限を取り消し（Service Role でRLS をバイパス）
    const { error: updateError } = await serviceSupabase
      .from("user_profiles")
      .update({
        premium_access: false,
        premium_access_source: null
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[revoke-pro] PRO権限取り消しエラー:", updateError);
      return NextResponse.json(
        { error: "PRO権限の取り消しに失敗しました" }, 
        { status: 500 }
      );
    }

    // 5. 監査ログに記録
    const { error: auditError } = await serviceSupabase
      .from("admin_audit_logs")
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "revoke_pro",
        details: {
          previous_state: {
            premium_access: targetUser.premium_access,
            premium_access_source: targetUser.premium_access_source
          },
          new_state: {
            premium_access: false,
            premium_access_source: null
          }
        }
      });

    if (auditError) {
      console.error("[revoke-pro] 監査ログ記録エラー:", auditError);
      // 権限取り消しは成功しているので、ログエラーは警告レベル
    }

    console.log(`[revoke-pro] PRO権限取り消し完了: ${user.id} → ${targetUserId}`);

    return NextResponse.json(
      { message: "PRO権限を取り消しました" }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("[revoke-pro] 予期しないエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" }, 
      { status: 500 }
    );
  }
}