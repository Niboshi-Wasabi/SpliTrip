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
      console.error("[grant-pro] 認証エラー:", authError);
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
      console.error("[grant-pro] 管理者権限なし:", { 
        userId: user.id, 
        adminProfile,
        error: profileError 
      });
      return NextResponse.json(
        { error: "管理者権限が必要です" }, 
        { status: 403 }
      );
    }

    // 3. Service Role クライアントでPRO権限を付与
    const serviceSupabase = createServiceRoleClient();
    
    // 対象ユーザーの存在確認
    const { data: targetUser, error: targetUserError } = await serviceSupabase
      .from("user_profiles")
      .select("id, premium_access, premium_access_source")
      .eq("id", targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      console.error("[grant-pro] 対象ユーザーが見つからない:", targetUserError);
      return NextResponse.json(
        { error: "対象ユーザーが見つかりません" }, 
        { status: 404 }
      );
    }

    // 既にPROの場合
    if (targetUser.premium_access) {
      return NextResponse.json(
        { message: "既にPRO権限が付与されています", alreadyPro: true }, 
        { status: 200 }
      );
    }

    // 4. PRO権限を付与（Service Role でRLS をバイパス）
    const { error: updateError } = await serviceSupabase
      .from("user_profiles")
      .update({
        premium_access: true,
        premium_access_source: "manual"
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[grant-pro] PRO権限付与エラー:", updateError);
      return NextResponse.json(
        { error: "PRO権限の付与に失敗しました" }, 
        { status: 500 }
      );
    }

    // 5. 監査ログに記録
    const { error: auditError } = await serviceSupabase
      .from("admin_audit_logs")
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "grant_pro",
        details: {
          previous_state: {
            premium_access: targetUser.premium_access,
            premium_access_source: targetUser.premium_access_source
          },
          new_state: {
            premium_access: true,
            premium_access_source: "manual"
          }
        }
      });

    if (auditError) {
      console.error("[grant-pro] 監査ログ記録エラー:", auditError);
      // 権限付与は成功しているので、ログエラーは警告レベル
    }

    console.log(`[grant-pro] PRO権限付与完了: ${user.id} → ${targetUserId}`);

    return NextResponse.json(
      { message: "PRO権限を付与しました" }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("[grant-pro] 予期しないエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" }, 
      { status: 500 }
    );
  }
}