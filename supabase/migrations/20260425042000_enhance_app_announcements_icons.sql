-- Enhance app_announcements with icon types and better categorization
-- お知らせテーブルにアイコン種別と分類の拡張

-- アイコンタイプカラムを追加
ALTER TABLE public.app_announcements 
ADD COLUMN IF NOT EXISTS icon_type text NOT NULL DEFAULT 'announcement';

-- アイコンタイプの制約を追加
ALTER TABLE public.app_announcements 
ADD CONSTRAINT check_icon_type 
CHECK (icon_type IN ('feature', 'bugfix', 'announcement', 'design', 'security', 'maintenance'));

-- 既存データの更新用コメント
COMMENT ON COLUMN public.app_announcements.icon_type IS 
  'Icon type for visual categorization: feature, bugfix, announcement, design, security, maintenance';

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_app_announcements_icon_type 
ON public.app_announcements (icon_type);

-- 優先度カラムを追加（将来の拡張用）
ALTER TABLE public.app_announcements 
ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.app_announcements.priority IS 
  'Display priority: higher numbers appear first. 0=normal, 1=high, 2=critical';

CREATE INDEX IF NOT EXISTS idx_app_announcements_priority_created 
ON public.app_announcements (priority DESC, created_at DESC) 
WHERE is_published = true;

-- サンプルお知らせデータの挿入（開発・テスト用）
INSERT INTO public.app_announcements (
  title_ja, title_en, 
  content_ja, content_en, 
  icon_type, priority, is_published
) VALUES 
(
  'SpliTrip 管理画面がリリースされました',
  'SpliTrip Admin Panel Released',
  '管理者向けのコントロールパネルが新しく追加されました。ユーザー管理、お知らせ作成、システム設定などの機能をご利用いただけます。',
  'A new admin control panel has been added for administrators. You can now manage users, create announcements, and configure system settings.',
  'feature',
  1,
  true
),
(
  'セキュリティ強化：生体認証再認証を導入',
  'Security Enhancement: Biometric Re-authentication',
  '管理画面のセキュリティを強化するため、アクセス時に生体認証による再認証が必要になりました。',
  'Enhanced admin security with biometric re-authentication required when accessing the admin panel.',
  'security',
  2,
  true
),
(
  'お知らせ機能のテスト',
  'Announcement Feature Test',
  'この機能をテストするためのサンプルお知らせです。実際の運用時には削除されます。',
  'This is a sample announcement for testing the announcement feature. It will be removed in production.',
  'announcement',
  0,
  false
)
ON CONFLICT DO NOTHING;