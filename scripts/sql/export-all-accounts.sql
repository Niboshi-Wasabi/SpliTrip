-- 全アカウント抽出（Auth + プロフィール）
-- 実行: Supabase Dashboard → SQL Editor（または psql / service role）
-- 注意: auth.users は機微情報（メール、メタデータ等）を含みます。取り扱いに注意してください。

-- ---------------------------------------------------------------------------
-- A. 推奨: 認証とプロフィールを 1 行にまとめた一覧（プロフィール未作成のユーザーも含む）
-- ---------------------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.phone,
  u.email_confirmed_at,
  u.phone_confirmed_at,
  u.last_sign_in_at,
  u.created_at AS auth_created_at,
  u.updated_at AS auth_updated_at,
  u.raw_user_meta_data,
  p.display_name,
  p.avatar_url,
  p.preferred_language,
  p.premium_access,
  p.premium_access_source,
  p.is_admin,
  p.two_factor_enabled,
  p.created_at AS profile_created_at
FROM auth.users AS u
LEFT JOIN public.user_profiles AS p
  ON p.id = u.id
ORDER BY u.created_at DESC;

-- ---------------------------------------------------------------------------
-- B. auth のみ（プロフィール不要な場合）
-- ---------------------------------------------------------------------------
-- SELECT
--   id,
--   email,
--   phone,
--   email_confirmed_at,
--   last_sign_in_at,
--   created_at,
--   raw_user_meta_data
-- FROM auth.users
-- ORDER BY created_at DESC;

-- ---------------------------------------------------------------------------
-- C. プロフィール行のみ（auth 側に存在するが紐づいていない行の確認用）
-- ---------------------------------------------------------------------------
-- SELECT * FROM public.user_profiles ORDER BY created_at DESC NULLS LAST;
