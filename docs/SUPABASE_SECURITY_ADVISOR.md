# Supabase Security Advisor メモ

本番の Database / Security Advisor の警告と、本リポジトリでの対応方針のメモです。

## 一般

- **マイグレーション**で RLS・関数を変更したあとは `notify pgrst, 'reload schema';` で PostgREST のスキーマキャッシュ更新を促す（既存マイグレーションに含まれる場合あり）。
- **ゲスト（匿名）モード**は廃止済み（`20260413120000_remove_guest_and_anonymous_mode.sql`）。匿名サインイン用の RLS 二重化や `auth_jwt_is_anonymous()` は存在しません。

## 参考リンク

- [Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
