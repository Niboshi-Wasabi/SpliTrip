-- Admin Control Panel Foundation Migration
-- 管理者権限フラグと監査ログテーブルの追加

-- 1. user_profiles テーブルに管理者フラグを追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. 管理者専用の監査ログテーブルを新規作成（存在しない場合のみ）
-- 既存の audit_logs は出費専用なので、別途管理者操作用のテーブルを作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_audit_logs'
  ) THEN
    CREATE TABLE public.admin_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      action text NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- 3. admin_audit_logs のRLSを有効化
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. 管理者のみが監査ログを閲覧できるポリシーを作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_audit_logs' 
    AND policyname = 'admin_audit_logs_select_policy'
  ) THEN
    CREATE POLICY "admin_audit_logs_select_policy" ON public.admin_audit_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
          AND up.is_admin = true
        )
      );
  END IF;
END $$;

-- 5. インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin) WHERE is_admin = true;

-- 6. 管理者権限チェック用のRPC関数を作成
-- 既存のセキュリティパターンに合わせてRPC関数を提供
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT up.is_admin 
     FROM public.user_profiles up 
     WHERE up.id = auth.uid()),
    false
  );
$$;