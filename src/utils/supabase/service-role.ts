import { createClient } from "@supabase/supabase-js";

/**
 * Service Role キーを使用したSupabaseクライアントを作成
 * RLS をバイパスして管理者操作を実行する際に使用
 * 
 * 注意：このクライアントはサーバーサイドでのみ使用し、
 * クライアントサイドには絶対に公開しないこと
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Service Role クライアントの初期化に必要な環境変数が設定されていません。" +
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください。"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}