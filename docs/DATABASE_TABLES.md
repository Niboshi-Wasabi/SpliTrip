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
| `user_profiles` | ユーザープロフィール | `06140000`, `05190000`, `05200000`, `07100000`, `08120000`, `09120000`, `12140000` |
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
  auth_users ||--o{ audit_logs : "actor_id"
  auth_users ||--o{ expense_comments : "author_id"
```

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

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版（現行マイグレーションに基づく `public` テーブル定義） |
| 2026-04-11 | `user_profiles.premium_access_source` と PRO フラグ自己変更防止トリガー（`20260412140000`） |
| 2026-04-11 | Security Advisor 想定 WARN の参照先として `SUPABASE_SECURITY_ADVISOR.md` を追記 |
| 2026-04-13 | ゲストモード廃止（`is_guest` 列削除・匿名 RLS 撤去、`20260413120000`） |
