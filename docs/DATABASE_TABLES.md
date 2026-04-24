# SpliTrip（splitrip）データベース表定義書

**スキーマ:** `public`（アプリが主に参照するテーブル）  
**前提:** Supabase（PostgreSQL）。`auth.users` は Supabase Auth のユーザーテーブル（本書では外部キー先としてのみ記載）。

最新の列は `supabase/migrations/` を日付順に適用した結果と一致する想定です。本番と差分がある場合はマイグレーション履歴を正としてください。

---

## 一覧

| テーブル名 | 概要 | 主な作成・変更マイグレーション |
|------------|------|--------------------------------|
| `groups` | 割り勘グループ | `20260405120000`, `05160000`, `08120000`, `10120000`（追補） |
| `group_members` | グループ所属 | `20260405120000`, `08120000` |
| `group_expenses` | グループの支出 | `20260405120000`, `06230000`, `08120000` |
| `expense_splits` | 支出の負担按分 | `20260405120000` |
| `user_profiles` | ユーザープロフィール | `06140000`, `05190000`, `05200000`, `07100000`, `08120000`, `09120000`, `12140000`, `22010000`（2FA）, `23223000`（`is_admin`）, `20260425042500`（`last_seen_announcement_id`） |
| `user_webauthn_credentials` | WebAuthn 2FA 認証器情報 | `20260422010000` |
| `user_backup_codes` | 2FA バックアップコード（ハッシュ） | `20260422010000` |
| `two_factor_security_events` | 2FA の検証監査イベント | `20260422013000` |
| `admin_audit_logs` | 管理画面向け操作ログ（PRO 手動付与など） | `20260423223000` |
| `app_announcements` | アプリ内お知らせ（What's New）多言語対応 | `20260424100000`, `20260425042000` |
| `system_settings` | 動的システム設定（メンテ・プロモバナー等） | `20260424100000` |
| `stripe_webhook_events` | Stripe Webhook 処理済み event の冪等記録 | `20260415070000` |
| `stripe_customer_user_links` | Stripe `customer_id` ↔ `auth.users` の紐付け | `20260415070000` |
| `audit_logs` | 支出の監査ログ | `06230000` |
| `expense_comments` | 支出へのコメント | `08120000` |

---

## リレーション（概要）

```mermaid
erDiagram
  auth_users["auth.users"] ||--o{ groups : "created_by"
  auth_users ||--o{ group_members : "user_id"
  groups ||--o{ group_members : "group_id"
  groups ||--o{ group_expenses : "group_id"
  groups ||--o{ audit_logs : "group_id"
  group_expenses ||--o{ expense_splits : "expense_id"
  group_expenses ||--o{ audit_logs : "expense_id"
  group_expenses ||--o{ expense_comments : "expense_id"
  auth_users ||--o{ group_expenses : "payer_id"
  auth_users ||--|| user_profiles : "id"
  auth_users ||--o{ user_webauthn_credentials : "user_id"
  auth_users ||--o{ user_backup_codes : "user_id"
  auth_users ||--o{ two_factor_security_events : "user_id"
  auth_users ||--o{ stripe_customer_user_links : "user_id"
  auth_users ||--o{ audit_logs : "actor_id"
  auth_users ||--o{ expense_comments : "author_id"
```

`stripe_webhook_events` はユーザー FK なし（`event_id` のみ主キー）。

---

## `groups`

割り勘グループ（旅行単位など）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | グループ ID |
| `name` | `text` | NOT NULL | — | — | 表示名 |
| `created_by` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE | 作成者 |
| `currency_code` | `text` | NOT NULL | `'JPY'` | — | 通貨コード |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 作成日時 |
| `invite_token` | `uuid` | NOT NULL | `gen_random_uuid()` | UNIQUE | 招待 URL 用トークン |
| `public_share_token` | `uuid` | NOT NULL | `gen_random_uuid()` | UNIQUE（インデックス名 `groups_public_share_token_key`） | 閲覧専用共有 URL 用（`/groups/[id]/shared?t=`） |

**備考:** `public_share_token` は `20260408120000_world_class_extensions.sql` および追補の `20260410120000_ensure_groups_public_share_token.sql` で追加。  
**RLS:** 有効（メンバー・作成者のみ参照など。詳細は各マイグレーション）。

---

## `group_members`

グループとユーザーの所属。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `group_id` | `uuid` | NOT NULL | — | FK → `groups(id)` ON DELETE CASCADE, PK 一部 | グループ |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE, PK 一部 | ユーザー |
| `role` | `text` | NOT NULL | `'member'` | CHECK `('owner','member')` | 役割 |
| `joined_at` | `timestamptz` | NOT NULL | `now()` | — | 参加日時 |

**主キー:** `(group_id, user_id)`  
**インデックス:** `user_id`（`idx_group_members_user_id`）

---

## `group_expenses`

グループ単位の支出（アプリ上の「出費」）。既存の別名 `expenses` と衝突しないよう `group_expenses` 命名。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | 支出 ID |
| `group_id` | `uuid` | NOT NULL | — | FK → `groups(id)` ON DELETE CASCADE | グループ |
| `payer_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE RESTRICT | 立替者 |
| `amount` | `numeric(14,2)` | NOT NULL | — | CHECK `amount > 0` | 金額 |
| `description` | `text` | NULL | — | — | 摘要 |
| `expense_date` | `date` | NOT NULL | UTC 基準の当日 | — | 支払日 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 行作成日時 |
| `category` | `text` | NOT NULL | `'other'` | CHECK `food, transport, lodging, sightseeing, other` | カテゴリ |
| `receipt_url` | `text` | NULL | — | — | Storage `receipts` バケット内のオブジェクトパス（公開 URL ではない） |
| `split_type` | `expense_split_mode` | NOT NULL | `'EQUAL'` | 型は enum | 割り方の種類（UI の高度な按分と対応） |

**備考:** `split_type` と enum `expense_split_mode` は `20260408120000` で追加。

---

## `expense_splits`

各支出に対するメンバー別の負担額・比率。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `expense_id` | `uuid` | NOT NULL | — | FK → `group_expenses(id)` ON DELETE CASCADE, PK 一部 | 支出 |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE, PK 一部 | 負担ユーザー |
| `amount` | `numeric(14,2)` | NOT NULL | — | CHECK `amount >= 0` | 負担金額 |
| `ratio` | `numeric(20,8)` | NOT NULL | `1` | CHECK `ratio >= 0` | 比率（按分計算用） |

**主キー:** `(expense_id, user_id)`  
**インデックス:** `expense_id`（`idx_expense_splits_expense_id`）

---

## `user_profiles`

アプリ用プロフィール（`auth.users` と 1:1）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | — | PK, FK → `auth.users(id)` ON DELETE CASCADE | ユーザー ID |
| `display_name` | `text` | NOT NULL | `'ユーザー'` | — | 表示名 |
| `avatar_url` | `text` | NULL | — | — | アバター URL |
| `paypal_me_id` | `text` | NULL | — | — | PayPal.me の識別子のみ（URL 全体は保存しない） |
| `cash_app_cashtag` | `text` | NULL | — | — | Cash App の Cashtag（`$` は含めない） |
| `preferred_language` | `text` | NOT NULL | `'ja'` | CHECK `('ja','en')` | UI 言語 |
| `created_at` | `timestamptz` | NULL | `now()` | — | 作成日時 |
| `payment_links` | `jsonb` | NOT NULL | `'[]'` | — | 複数送金先 URL 等の配列 |
| `pitch_deck_seen_at` | `timestamptz` | NULL | — | — | 機能紹介スライドを最後まで見た日時（NULL は未表示扱いのロジックあり） |
| `ocr_usage_count` | `integer` | NOT NULL | `0` | CHECK `>= 0` | レシート OCR 利用回数 |
| `premium_access` | `boolean` | NOT NULL | `false` | — | PRO 等のフラグ |
| `premium_access_source` | `text` | NOT NULL | `'none'` | CHECK `none \| stripe \| manual` | PRO 付与の根拠（課金・運営手動など） |
| `two_factor_enabled` | `boolean` | NOT NULL | `false` | — | WebAuthn 2FA を有効化済みか |
| `is_admin` | `boolean` | NOT NULL | `false` | — | 管理系 API / `/admin` 相当へのアクセス可否（`20260423223000`） |
| `last_seen_announcement_id` | `uuid` | NULL | — | FK → `app_announcements(id)` ON DELETE SET NULL | 最後に確認したお知らせID（What's New追跡用、`20260425042500`） |

**備考:** `pitch_deck_seen_at` のバックフィル・`needs_pitch_deck` / `mark_pitch_deck_seen` は `07100000`。  
**PRO 手動付与:** Supabase **SQL Editor** で `premium_access = true` と `premium_access_source = 'manual'` を同一ユーザ行に更新する（JWT なしの管理者実行を想定）。認証ユーザーによる自己昇格は `user_profiles_guard_premium_flags_trigger` で拒否。  
**RLS:** 有効（自己更新・同一グループメンバー間の参照など）。

---

## `audit_logs`

`group_expenses` の変更履歴（追記のみ想定）。INSERT は主にトリガー経由。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | ログ ID |
| `group_id` | `uuid` | NOT NULL | — | FK → `groups(id)` ON DELETE CASCADE | グループ |
| `expense_id` | `uuid` | NULL | — | FK なし（削除後の参照用に NULL 等を許容） | 対象支出 |
| `actor_id` | `uuid` | NULL | — | FK → `auth.users(id)` ON DELETE SET NULL | 操作者 |
| `action` | `text` | NOT NULL | — | CHECK `insert, update, delete` | 操作種別 |
| `payload` | `jsonb` | NOT NULL | `'{}'` | — | 変更内容のスナップショット等 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 記録日時 |

**インデックス:** `group_id`, `expense_id`, `created_at` DESC

---

## `user_webauthn_credentials`

WebAuthn の資格情報（パスキー/セキュリティキー）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | 資格情報レコード ID |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE | 所有ユーザー |
| `credential_id` | `text` | NOT NULL | — | UNIQUE | WebAuthn credential ID |
| `public_key` | `text` | NOT NULL | — | — | credential public key（base64url） |
| `counter` | `bigint` | NOT NULL | `0` | — | 署名カウンタ（リプレイ対策） |
| `transports` | `text[]` | NOT NULL | `'{}'::text[]` | — | 認証器 transport（internal / usb 等） |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | 更新日時 |
| `last_used_at` | `timestamptz` | NULL | — | — | 最終利用日時 |

**インデックス:** `user_id`（`idx_user_webauthn_credentials_user_id`）  
**RLS:** 有効（本人のみ select/insert/update/delete）。

---

## `user_backup_codes`

2FA バックアップコード（平文は保持せずハッシュを保存）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | バックアップコード行 ID |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE | 所有ユーザー |
| `code_hash` | `text` | NOT NULL | — | — | バックアップコードのハッシュ |
| `used_at` | `timestamptz` | NULL | — | — | 使用済み日時（NULL は未使用） |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 作成日時 |

**インデックス:** `user_id`（`idx_user_backup_codes_user_id`）  
**RLS:** 有効（本人のみ select/insert/update/delete）。

---

## `two_factor_security_events`

2FA 検証の監査イベント（成功/失敗・IP・理由メタデータ）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | イベント ID |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE | 対象ユーザー |
| `action` | `text` | NOT NULL | — | — | `register_verify` / `authenticate_verify` / `backup_verify` / `backup_regenerate` |
| `success` | `boolean` | NOT NULL | `false` | — | 成否 |
| `ip_address` | `text` | NULL | — | — | リクエスト送信元 IP（`x-forwarded-for` 先頭） |
| `metadata` | `jsonb` | NOT NULL | `'{}'::jsonb` | — | 失敗理由などの付加情報 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 記録日時 |

**インデックス:** `(user_id, action, created_at desc)`, `(action, success, created_at desc)`  
**RLS:** 有効（本人のみ select/insert）。

---

## `admin_audit_logs`

管理操作の監査ログ（例: PRO 手動付与）。`user_profiles.is_admin = true` のユーザーのみ SELECT 可（ポリシー `admin_audit_logs_select_admin_only`）。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | ログ ID |
| `admin_user_id` | `uuid` | NULL | — | FK → `auth.users(id)` ON DELETE SET NULL | 操作した管理者 |
| `target_user_id` | `uuid` | NULL | — | FK → `auth.users(id)` ON DELETE SET NULL | 対象ユーザー |
| `action` | `text` | NOT NULL | — | — | 操作種別（アプリが定義） |
| `details` | `jsonb` | NOT NULL | `'{}'::jsonb` | — | 付加情報 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 記録日時 |

**インデックス:** `created_at` desc, `admin_user_id`, `target_user_id`  
**RLS:** 有効（管理者のみ select）。  
**マイグレーション:** `20260423223000_admin_control_panel_foundation.sql`

---

## `stripe_webhook_events`

Stripe Webhook の再送・重複を避けるため、**処理済み**の `event_id` を保持する。アプリの Service Role 経由でのみ操作を想定。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `event_id` | `text` | NOT NULL | — | PRIMARY KEY | Stripe event ID |
| `event_type` | `text` | NOT NULL | — | — | イベント種別 |
| `processed_at` | `timestamptz` | NOT NULL | `now()` | — | 処理日時 |

**RLS:** 有効。`service_role` 向けポリシー（全操作）。`20260415070000_stripe_webhook_idempotency_and_customer_link.sql`

---

## `stripe_customer_user_links`

Stripe Customer と Supabase ユーザーの対応。サブスクリプション系 Webhook で `user_id` を解決する。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `customer_id` | `text` | NOT NULL | — | PRIMARY KEY | Stripe `cus_...` |
| `user_id` | `uuid` | NOT NULL | — | UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE | 対応ユーザー |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | 更新日時 |

**インデックス:** `user_id` 一意（`idx_stripe_customer_user_links_user_id`）  
**RLS:** 有効。`service_role` 向けポリシー（全操作）。  
**マイグレーション:** `20260415070000_stripe_webhook_idempotency_and_customer_link.sql`

---

## `expense_comments`

支出に紐づくコメント。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | コメント ID |
| `expense_id` | `uuid` | NOT NULL | — | FK → `group_expenses(id)` ON DELETE CASCADE | 支出 |
| `author_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE | 投稿者 |
| `body` | `text` | NOT NULL | — | CHECK 非空・`char_length(body) <= 2000` | 本文 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 投稿日時 |

**インデックス:** `expense_id`

---

## 付録: 列挙型 `expense_split_mode`

**スキーマ:** `public`（テーブルではないが `group_expenses.split_type` で使用）

| 値 | 意味（アプリ側の対応） |
|----|-------------------------|
| `EQUAL` | 均等割り |
| `EXACT` | 金額指定 |
| `PERCENTAGE` | パーセント |
| `SHARES` | 比率（シェア） |
| `ITEMIZED` | 明細行 |

定義: `20260408120000_world_class_extensions.sql`

---

## 付録: Security Advisor

Supabase Dashboard の Advisor 警告の整理方針は **`SUPABASE_SECURITY_ADVISOR.md`** を参照。ゲスト（匿名）専用の RLS は **`20260413120000_remove_guest_and_anonymous_mode.sql`** で撤去済み。

---

## 付録: Storage（テーブル外）

領収書ファイルは **`receipts`** プライベートバケットに保存し、`group_expenses.receipt_url` にバケット内パスを保持する設計（`06230000` 付近のマイグレーション・ポリシー参照）。

---

## 付録: レガシー `public.expenses`（本リポでは未定義）

本リポジトリのマイグレーションは **`public.group_expenses` を新設**し、レガシー用の `public.expenses` は**作成しません**。  
古い Supabase プロジェクトに**既存の** `public.expenses` がある場合のみ、一部 RLS マイグレーション（例: `20260412210000` 等）が `to_regclass('public.expenses')` を参照してポリシーを当てることがあります。新規プロジェクトで当該テーブルは通常存在しません。

---

## `app_announcements`

アプリ内お知らせ（What's New）の管理。多言語対応でアイコン・優先度による分類機能付き。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY | お知らせ ID |
| `title_ja` | `text` | NOT NULL | `''` | — | 日本語タイトル |
| `title_en` | `text` | NOT NULL | `''` | — | 英語タイトル |
| `content_ja` | `text` | NOT NULL | `''` | — | 日本語本文 |
| `content_en` | `text` | NOT NULL | `''` | — | 英語本文 |
| `icon_type` | `text` | NOT NULL | `'announcement'` | CHECK `('feature', 'bugfix', 'announcement', 'design', 'security', 'maintenance')` | アイコン種別 |
| `priority` | `integer` | NOT NULL | `0` | — | 表示優先度（0=通常、1=高、2=緊急） |
| `is_published` | `boolean` | NOT NULL | `false` | — | 公開フラグ |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | 更新日時（トリガーで自動更新） |

**インデックス:** `created_at` DESC, `is_published`, `icon_type`, `(priority DESC, created_at DESC)` WHERE `is_published = true`
**RLS:** 有効（公開済みは誰でも読取可、管理者は全操作可）。
**マイグレーション:** `20260424100000`, `20260425042000`（アイコン・優先度追加）

---

## `system_settings`

動的システム設定（メンテナンス・プロモバナー等）。アプリ再デプロイなしで機能切替可能。

| 列名 | 型 | NULL | デフォルト | 制約・参照 | 説明 |
|------|-----|------|------------|------------|------|
| `key` | `text` | NOT NULL | — | PRIMARY KEY | 設定キー |
| `value` | `jsonb` | NOT NULL | `'{}'::jsonb` | — | 設定値（JSON） |
| `description` | `text` | NULL | — | — | 設定の説明 |

**初期データ:** `maintenance_mode`, `maintenance_announcement`, `promo_banner_config`
**RLS:** 有効（特定キーは全ユーザー読取可、管理者は全操作可）。
**マイグレーション:** `20260424100000`

---

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版（現行マイグレーションに基づく `public` テーブル定義） |
| 2026-04-11 | `user_profiles.premium_access_source` と PRO フラグ自己変更防止トリガー（`20260412140000`） |
| 2026-04-11 | Security Advisor 想定 WARN の参照先として `SUPABASE_SECURITY_ADVISOR.md` を追記 |
| 2026-04-13 | ゲストモード廃止（`is_guest` 列削除・匿名 RLS 撤去、`20260413120000`） |
| 2026-04-23 | WebAuthn 2FA 関連テーブル（`user_webauthn_credentials`, `user_backup_codes`, `two_factor_security_events`）と `user_profiles.two_factor_enabled` を追記 |
| 2026-04-24 | `user_profiles.is_admin` と `admin_audit_logs`（`20260423223000`）を追記 |
| 2026-04-25 | マイグレーション再照合: `stripe_webhook_events` / `stripe_customer_user_links`（`20260415070000`）を追記。レガシー `public.expenses` について付記 |
| 2026-04-25 | `app_announcements`, `system_settings` テーブル定義と `user_profiles.last_seen_announcement_id` カラムを追記（FEATURES.md整合性確保） |
