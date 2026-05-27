# 管理画面スイート — 姉妹プロジェクト（家計簿）移植ガイド

SpliTrip（本リポジトリ `tabipay`）の **Admin Control Panel Suite** を、姉妹プロジェクト **kakeibo-app**（`c:\Users\user\kakeibo-app`）へ移植するための仕様書兼エージェント用プロンプトです。

## 参照元インベントリ（SpliTrip）

| 領域 | パス |
|------|------|
| 管理 UI | `src/app/[locale]/admin/**`, `src/components/admin/**` |
| 管理 API | `src/app/api/admin/**` |
| 公開 API | `src/app/api/maintenance/status`, `src/app/api/public/system-status`, `src/app/api/public/announcements`, **`src/app/api/cron/system-status`**（Cron・`CRON_SECRET`） |
| lib | `src/lib/admin/*`, `src/lib/maintenance*.ts`, `src/lib/system-status.ts`, **`src/lib/system-status-probe.ts`**, `src/lib/system-settings.ts`, `src/lib/auth/admin-step-up-guard.ts` |
| ガード | `src/proxy.ts` |
| 仕様 | `docs/FEATURES.md`（メンテナンス・管理画面） |
| DB | `supabase/migrations/20260423223000_admin_control_panel_foundation.sql` ほか6本（プラン参照） |

### 管理タブ（7 + verify）

| ルート | 機能 |
|--------|------|
| `/admin` | ユーザー KPI・PRO 付与/解除・Stripe 同期・論理削除 |
| `/admin/announcements` | `app_announcements` CRUD・Markdown・プレビュー |
| `/admin/maintenance` | `maintenance_schedules` |
| `/admin/status` | `system_status` 一括更新 |
| `/admin/system` | `system_settings`（全画面メンテ・バナー・プロモ） |
| `/admin/audit-logs` | `admin_audit_logs` |
| `/admin/support` | 問い合わせ調査（SpliTrip: グループ+出費） |
| `/admin/verify` | Step-Up（デフォルト無効・即リダイレクト） |

---

## 家計簿（kakeibo-app）向けマッピング（確定）

### テーブル名

| SpliTrip | kakeibo-app |
|----------|-------------|
| `user_profiles` | **`profiles`** |
| `groups` + `group_expenses` | 将来 `groups` + `transactions`。**現状**はサポート API を **`profiles` + ユーザー ID** ベースにする |

### `system_status.service_key`（kakeibo シード）

| service_key | 説明 |
|-------------|------|
| `core_api_database` | Supabase Postgres / RLS |
| `authentication` | Supabase Auth |
| `transactions_api` | 取引 CRUD（未実装時も placeholder） |
| `stripe_payments` | SaaS 課金（Phase 3） |
| `receipt_ai` | レシート OCR / AI（Phase 2） |

状態値: `operational` \| `degraded` \| `partial_outage` \| `major_outage`

### サポートツール

| 項目 | SpliTrip | kakeibo-app |
|------|----------|-------------|
| API | `GET /api/admin/support/groups/[groupId]` | `GET /api/admin/support/users/[userId]` |
| 監査 action | `support_view_group` | **`support_view_user`** |
| UI | `support-group-tool.tsx` | **`support-user-tool.tsx`** |
| レスポンス | `group` + `expenses[]` | `profile` + `transactions[]`（テーブル未作成時は空配列） |

### PRO / プレミアム（部分移植）

- 列: `profiles.premium_access`, `profiles.premium_access_source`（`none` \| `stripe` \| `manual`）
- 管理 UI の grant / revoke / sync-stripe は維持。家計簿の PRO 機能セット（OCR 上限等）は Phase 3 で別途定義
- 自己昇格防止トリガー: `profiles_guard_premium_flags`（`user_profiles_guard_premium_flags` 相当）

### 命名プレフィックス

| SpliTrip | kakeibo-app |
|----------|-------------|
| `splitrip_*` Cookie / localStorage | **`kakeibo_*`** |
| `SPLITRIP_*` ヘッダ | **`KAKEIBO_*`**（必要時） |

### i18n

- SpliTrip: `next-intl` の `Admin` 名前空間
- kakeibo-app: **`src/lib/i18n/admin-messages.ts`** + `useAdminTranslations()`（next-intl 未導入のため）

---

## エージェント用プロンプト（コピー用）

以下を家計簿プロジェクトの Cursor に貼り付けて実行してください。

````
# 依頼: SpliTrip 管理画面スイートの完全移植（家計簿アプリ / kakeibo-app）

## 背景
姉妹プロジェクト SpliTrip（tabipay）の Admin Control Panel Suite を、kakeibo-app に同等の運用体験で実装する。

参照: tabipay の `docs/ADMIN_PORT_PROMPT.md` および `src/app/[locale]/admin/**`, `src/app/api/admin/**`, 関連マイグレーション。

技術: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase, ロケールは `[locale]` + `src/lib/routing.ts`（next-intl は未必須。管理文言は `src/lib/i18n/admin-messages.ts`）。

## 必須スコープ

### 1. DB（profiles ベース）
- `profiles.is_admin`, `deleted_at`, `premium_access`, `premium_access_source`, `last_seen_announcement_id`
- `admin_audit_logs`, `app_announcements`, `system_settings`, `maintenance_schedules`, `system_status`
- RLS: 公開 read + 管理者 write（SpliTrip 同等）
- `profiles_guard_premium_flags` トリガー
- `system_status` シード: core_api_database, authentication, transactions_api, stripe_payments, receipt_ai

### 2. 管理 UI（7タブ + AdminAppShell）
パス `src/app/[locale]/admin/**`。サポートは **ユーザー ID** 調査に差し替え。

### 3. 管理 API
`/api/admin/*` 一式。`user_profiles` → `profiles` に置換。サポートは `/api/admin/support/users/[userId]`。

### 4. 公開連動
- middleware: `/admin` ガード、メンテバイパス、削除ユーザー誘導
- `/{locale}/maintenance`, `/{locale}/status`
- `GET /api/maintenance/status`, `GET /api/public/system-status`
- 設定画面に管理者リンク

### 5. 環境変数
`SUPABASE_SERVICE_ROLE_KEY`, `MAINTENANCE_MODE`, `ADMIN_STEP_UP_ENABLED`（任意）, `STRIPE_SECRET_KEY`（sync 用）

### 6. 完了条件
- 管理者のみ `/admin` アクセス
- 7タブ動作、監査ログ記録、公開 status / メンテ連動
- `docs/FEATURES.md` 更新

実装順: マイグレーション → lib → API → 管理 UI → middleware → 公開 UI → i18n。
SpliTrip から構造コピーし、上記マッピングのみ差し替えること。
````

---

## 移植実施状況（kakeibo-app）

本ドキュメント作成時に `kakeibo-app` へ以下を投入:

- `supabase/migrations/20260518120000_admin_control_panel_suite.sql`
- `src/app/api/admin/**`（profiles 適応）
- `src/app/[locale]/admin/**`
- 関連 `src/lib/**`, `src/components/**`
- `src/middleware.ts` 拡張

詳細は kakeibo-app の `docs/FEATURES.md` を参照。
