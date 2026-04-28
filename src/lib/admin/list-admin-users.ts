import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type AdminUserListItem = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  premium_access: boolean;
  premium_access_source: string | null;
  is_admin: boolean;
  deleted_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

/**
 * 管理者用：全ユーザーの一覧を取得
 * Service Role を使用してauth.users から直接情報を取得
 */
export async function listAdminUsers(): Promise<{
  items: AdminUserListItem[];
  totalCount: number;
}> {
  const serviceSupabase = createServiceRoleClient();

  // auth.admin.listUsers() を使用してユーザー情報を取得
  const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("[listAdminUsers] auth.admin.listUsers エラー:", authError);
    throw new Error("ユーザー一覧の取得に失敗しました");
  }

  if (!authUsers.users || authUsers.users.length === 0) {
    return {
      items: [],
      totalCount: 0,
    };
  }

  // user_profiles からプロフィール情報を取得
  const userIds = authUsers.users.map(user => user.id);
  const { data: profiles, error: profilesError } = await serviceSupabase
    .from("user_profiles")
    .select("id, display_name, avatar_url, premium_access, premium_access_source, is_admin, deleted_at")
    .in("id", userIds);

  if (profilesError) {
    console.error("[listAdminUsers] プロフィール取得エラー:", profilesError);
    throw new Error("プロフィール情報の取得に失敗しました");
  }

  // プロフィール情報をマップに変換
  const profileMap = new Map(
    (profiles || []).map(profile => [profile.id, profile])
  );

  // authユーザーとプロフィールを結合
  const result: AdminUserListItem[] = authUsers.users.map(authUser => {
    const profile = profileMap.get(authUser.id);
    
    return {
      id: authUser.id,
      email: authUser.email || null,
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
      premium_access: profile?.premium_access || false,
      premium_access_source: profile?.premium_access_source || null,
      is_admin: profile?.is_admin || false,
      deleted_at: profile?.deleted_at || null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
    };
  });

  // 作成日時の降順でソート（新しいユーザーを上に）
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    items: result,
    totalCount: result.length,
  };
}