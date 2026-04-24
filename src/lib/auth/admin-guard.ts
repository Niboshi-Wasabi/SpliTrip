import { createClient } from "@/utils/supabase/server";

/**
 * 現在のユーザーが管理者権限を持っているかチェック
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.is_admin || false;
  } catch (error) {
    console.error("[isCurrentUserAdmin] エラー:", error);
    return false;
  }
}

/**
 * 管理者権限が必要なAPIエンドポイント用のガード関数
 */
export async function requireAdminAuth() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("認証が必要です");
  }

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("管理者権限が必要です");
  }

  return { user, supabase };
}