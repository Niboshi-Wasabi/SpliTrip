-- Test Admin User Creation
-- テスト用管理者ユーザーの作成（開発・テスト環境用）

-- 注意: 本番環境では手動でUUIDを指定して管理者を設定すること
-- この SQL は開発用のサンプルです

-- 既存ユーザーがいる場合に、最初のユーザーを管理者に設定する例
-- 実際の運用では、特定のユーザーIDを指定して管理者権限を付与してください

-- 例：特定のユーザーを管理者に設定（UUIDは実際の値に置き換えてください）
-- UPDATE public.user_profiles 
-- SET is_admin = true 
-- WHERE id = 'your-actual-user-uuid-here';

-- 開発環境でのテスト用コメント
-- 管理者権限の付与は以下の手順で行います：
-- 1. ユーザーが一度ログインして user_profiles にレコードが作成される
-- 2. Supabase Dashboard → SQL Editor で以下を実行：
--    UPDATE public.user_profiles 
--    SET is_admin = true 
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 管理者権限チェック用のヘルパー関数を追加
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    updated_count integer;
BEGIN
    -- メールアドレスからユーザーIDを検索
    SELECT au.id INTO target_user_id
    FROM auth.users au
    WHERE au.email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
        RETURN false;
    END IF;
    
    -- user_profilesで管理者フラグを設定
    UPDATE public.user_profiles
    SET is_admin = true
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count = 0 THEN
        RAISE EXCEPTION 'User profile not found for %', user_email;
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- 使用例のコメント:
-- SELECT public.make_user_admin('admin@example.com');