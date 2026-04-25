import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type AdminAuditLogItem = {
  id: string;
  admin_user_id: string | null;
  target_user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  admin_display_name: string | null;
  admin_email: string | null;
  target_display_name: string | null;
  target_email: string | null;
};

/**
 * 管理者用：監査ログの一覧を取得
 * 管理者とターゲットユーザーの情報も含めて返す
 */
export async function listAdminAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<AdminAuditLogItem[]> {
  const serviceSupabase = createServiceRoleClient();

  // 監査ログを取得（新しい順）
  const { data: auditLogs, error: auditError } = await serviceSupabase
    .from("admin_audit_logs")
    .select("id, action, target_type, target_id, target_user_id, details, admin_user_id, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (auditError) {
    console.error("[listAdminAuditLogs] 監査ログ取得エラー:", auditError);
    throw new Error("監査ログの取得に失敗しました");
  }

  if (!auditLogs || auditLogs.length === 0) {
    return [];
  }

  // 管理者とターゲットユーザーのIDを収集（重複を除く）
  const userIds = new Set<string>();
  auditLogs.forEach(log => {
    if (log.admin_user_id) userIds.add(log.admin_user_id);
    if (log.target_user_id) userIds.add(log.target_user_id);
  });

  const userIdsArray = Array.from(userIds);
  
  // auth.usersから基本情報を取得
  const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers();
  if (authError) {
    console.error("[listAdminAuditLogs] ユーザー情報取得エラー:", authError);
    throw new Error("ユーザー情報の取得に失敗しました");
  }

  // user_profilesからプロフィール情報を取得
  const { data: profiles, error: profilesError } = await serviceSupabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", userIdsArray);

  if (profilesError) {
    console.error("[listAdminAuditLogs] プロフィール取得エラー:", profilesError);
    throw new Error("プロフィール情報の取得に失敗しました");
  }

  // ユーザー情報をマップに変換
  const userInfoMap = new Map<string, { email: string | null; display_name: string | null }>();
  
  // authUsers から email を取得
  authUsers.users?.forEach(user => {
    userInfoMap.set(user.id, {
      email: user.email || null,
      display_name: null // プロフィールで上書きする
    });
  });

  // profiles から display_name を上書き
  profiles?.forEach(profile => {
    const existing = userInfoMap.get(profile.id);
    if (existing) {
      existing.display_name = profile.display_name;
    } else {
      userInfoMap.set(profile.id, {
        email: null,
        display_name: profile.display_name
      });
    }
  });

  // 監査ログにユーザー情報を結合
  const result: AdminAuditLogItem[] = auditLogs.map(log => {
    const adminInfo = log.admin_user_id ? userInfoMap.get(log.admin_user_id) : null;
    const targetInfo = log.target_user_id ? userInfoMap.get(log.target_user_id) : null;

    return {
      id: log.id,
      admin_user_id: log.admin_user_id,
      target_user_id: log.target_user_id,
      action: log.action,
      details: log.details || {},
      created_at: log.created_at,
      admin_display_name: adminInfo?.display_name || null,
      admin_email: adminInfo?.email || null,
      target_display_name: targetInfo?.display_name || null,
      target_email: targetInfo?.email || null,
    };
  });

  return result;
}