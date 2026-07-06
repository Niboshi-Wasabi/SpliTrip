# アプリケーション仕様書：SpliTrip（スプリトリップ）

> **注意（2026-07）**  
> 本ファイルは**初期要件・設計メモ**です。現在の実装状況は次を正としてください。
>
> | ドキュメント | 用途 |
> |-------------|------|
> | **[README.md](README.md)** | ポートフォリオ向け概要・クイックスタート |
> | **[docs/FEATURES.md](docs/FEATURES.md)** | 機能・API・運用の最新一覧 |
> | **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | アーキテクチャ・設計判断 |
> | **[docs/DATABASE_TABLES.md](docs/DATABASE_TABLES.md)** | DB スキーマ |
>
> 特に **§6.2「未実装」は古い情報** です（グループ招待・出費入力・Realtime・OCR 等は実装済み）。

## 1. プロジェクト概要

グループ旅行中のお金の立替をリアルタイムに記録し、「誰が誰にいくら払うか」を自動計算・可視化するWebアプリ（PWA）。アプリ名は **SpliTrip（スプリトリップ）**。

## 2. ユーザー認証・アカウント要件

- **対応プロバイダ:** Google, LINE
- **認証基盤:** Supabase Auth を使用
- **Google 認証フロー:** OAuth 2.0 (PKCE) → `/auth/callback` で `exchangeCodeForSession` → `user_profiles` を upsert → `/dashboard` へリダイレクト
- **LINE 認証フロー:** `/api/auth/line` で LINE 認可 URL へリダイレクト → コールバック `GET /api/auth/callback/line` で認可コードをトークンに交換 → `id_token` を `signInWithIdToken`（provider: `line`）で Supabase セッション化 → `user_profiles` を upsert → `/dashboard` へリダイレクト（環境変数: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `NEXT_PUBLIC_LINE_REDIRECT_URI`）。Supabase の [Providers] で LINE を有効化し、チャネル ID は `.env` の `LINE_CHANNEL_ID` と一致させること。
- **セッション管理:** `@supabase/ssr` によるサーバーサイド Cookie ベースのセッション
- **認証ガード:** Next.js Middleware でセッションを検証し、未認証ユーザーを `/` へリダイレクト
- **プロフィール同期:** ログイン成功後、`auth.users` のメタデータから `display_name` / `avatar_url` を取り出し `user_profiles` に upsert（`src/lib/user-profile.ts`）

## 3. 機能要件

### 3.1 旅行（トリップ）管理
- 旅行（trip）の作成
- URLによる招待
- メンバー一覧表示

### 3.2 支出記録
- 金額、内容、支払者、対象者、カテゴリの入力
- Supabase Realtime で即時反映

### 3.3 ダッシュボード
- Recharts を使用した総支出とカテゴリ別支出割合（ドーナツチャート）の可視化
- メンバー別の支払額・負担額・収支バランスの一覧
- 総支出 / メンバー数 / 一人あたり金額のサマリーカード

### 3.4 精算実行
- 送金回数が最小になるグリーディアルゴリズムでの計算
- 精算プランの可視化（送金元 → 送金先 + 金額）

### 3.5 決済リンク連携
- ユーザープロフィールに「PayPay」「LINE Pay」などの送金URLを登録
- 精算画面から1タップで決済アプリを起動（ディープリンク）

### 3.6 拡張予定機能
- レシートOCR
- 多通貨自動換算
- オフラインPWA対応
- CSVエクスポート
- ダークモード

## 4. 技術スタック

| カテゴリ | 技術 | バージョン |
| --- | --- | --- |
| Runtime | Node.js | >= 20 |
| Frontend | Next.js (App Router) | 16.2.2 |
| CSS | Tailwind CSS | v4 |
| UI Components | shadcn/ui | v4.1.2 |
| Icons | Lucide React | v1.7.0 |
| Charts | Recharts | v3.8.1 |
| Auth / DB | Supabase (PostgreSQL) | supabase-js v2.101.1 |
| Auth (SSR) | @supabase/ssr | v0.10.0 |
| Testing | Jest + React Testing Library | Jest v30, RTL v16 |
| Language | TypeScript | v5 |

## 5. データモデル (Supabase PostgreSQL)

アプリ実装は次のテーブル名を前提とする。

### 5.1 `user_profiles`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | ユーザーID (`auth.users.id` と同一) |
| display_name | text | 表示名 |
| avatar_url | text | アバター画像URL（任意） |
| payment_link | text | 送金URL（任意・将来の決済連携用） |
| created_at | timestamptz | 作成日時（任意） |

OAuth 初回ログイン時に `id`, `display_name`, `avatar_url` を upsert する。

### 5.2 `trips`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | 旅行ID |
| name | text | 旅行名（ダッシュボードヘッダに表示。実装は `name` を参照） |
| created_at | timestamptz | 作成日時（任意） |
| owner_id | uuid (FK → user_profiles.id) | オーナー（任意） |

### 5.3 `trip_members`
| カラム | 型 | 説明 |
| --- | --- | --- |
| trip_id | uuid (FK → trips.id) | 旅行ID |
| user_id | uuid (FK → auth.users / user_profiles.id) | ユーザーID |
| joined_at | timestamptz | 参加日時 |

### 5.4 `expenses`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | 支出ID |
| trip_id | uuid (FK → trips.id) | 旅行ID |
| payer_id | uuid (FK → user_profiles.id) | 支払者ID |
| amount | numeric | 金額 |
| description | text | 内容（任意） |
| category | text | カテゴリ |
| split_details | jsonb | 割り勘の詳細（任意） |
| created_at | timestamptz | 作成日時 |

**ダッシュボードのデータ範囲:** ログインユーザーが `trip_members` に含まれる旅行のうち、`joined_at` が最も新しい **1件の trip** に紐づく `expenses` のみを集計する。

---

## 6. 実装状況

**最新の一覧は [`docs/FEATURES.md`](docs/FEATURES.md) を参照してください。**

### 6.1 実装済み（抜粋）

| 領域 | 状態 |
|------|------|
| 認証（Google / LINE / メール） | 完了 |
| グループ作成・招待（URL / QR）・参加 | 完了 |
| 出費入力（多様な按分・端数ポリシー） | 完了 |
| Supabase Realtime 連携 | 完了 |
| 精算アルゴリズム・送金リンク・送金済み永続化 | 完了 |
| レシート OCR（Gemini）・ローカル Inbox | 完了 |
| 多通貨（参考レート・JPY スナップショット） | 完了 |
| i18n（ja / en）、ダークモード | 完了 |
| CSV / PDF エクスポート（PRO） | 完了 |
| 管理画面・メンテナンス・ステータスページ | 完了 |
| Stripe Webhook（PRO 基盤） | 完了 |
| Jest 単体テスト・CI セキュリティスキャン | 完了 |

### 6.2 未完了・今後の候補

| 機能 | 備考 |
|------|------|
| Web Push 通知 | API プレースホルダーのみ |
| PRO 課金 UI | Stripe 審査対応のため一時「準備中」 |
| オフライン出費キュー | レシート Inbox は実装済み、出費本体の同期は未 |
| 2FA 強制フロー | WebAuthn 基盤は存続、ログイン直後の強制はオフ |

## 7. プロジェクト構成

```
（プロジェクトルート ※フォルダ名は環境により異なる）
├── .env.local                          # Supabase 接続情報
├── requirements.md                     # 本ドキュメント
├── package.json
├── tsconfig.json
├── jest.config.ts                      # Jest 設定
├── jest.setup.ts                       # @testing-library/jest-dom 読み込み
├── next.config.ts
├── components.json                     # shadcn/ui 設定
│
└── src/
    ├── middleware.ts                    # Next.js Middleware エントリポイント
    │
    ├── app/
    │   ├── layout.tsx                  # ルートレイアウト (lang="ja", フォント設定)
    │   ├── globals.css                 # Tailwind CSS + shadcn テーマ変数
    │   ├── page.tsx                    # ログイン画面 (Suspense ラッパー)
    │   ├── login-form.tsx             # ログインフォーム (Client Component)
    │   ├── page.test.tsx              # ログイン画面の単体テスト
    │   │
    │   ├── auth/
    │   │   └── callback/
    │   │       └── route.ts           # OAuth コールバック (セッション確立 + user_profiles upsert)
    │   │
    │   └── dashboard/
    │       ├── page.tsx               # ダッシュボード (Server Component)
    │       ├── category-chart.tsx     # カテゴリ別ドーナツチャート (Client Component)
    │       ├── logout-button.tsx      # ログアウトボタン (Client Component)
    │       ├── loading.tsx            # スケルトンローディング UI
    │       └── error.tsx              # エラーバウンダリ UI
    │
    ├── components/
    │   └── ui/                        # shadcn/ui コンポーネント
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       └── dialog.tsx
    │
    ├── lib/
    │   ├── utils.ts                   # cn() ユーティリティ (shadcn)
    │   ├── format.ts                  # formatYen() - 金額フォーマット
    │   ├── categories.ts             # カテゴリ別カラー定義
    │   ├── settlements.ts            # 最小送金回数の精算アルゴリズム
    │   ├── dashboard-data.ts         # ダッシュボード用データ取得・集計（trips / trip_members / expenses）
    │   └── user-profile.ts           # ログイン後の user_profiles upsert
    │
    └── utils/
        └── supabase/
            ├── client.ts             # ブラウザ用 Supabase クライアント (@supabase/ssr)
            ├── server.ts             # サーバー用 Supabase クライアント (Cookie連携)
            ├── env.ts                # 環境変数の検証・プレースホルダー除外
            └── middleware.ts          # セッション更新 + 認証ガードロジック
```

## 8. 環境変数

| 変数名 | 用途 | 必須 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL | はい |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の匿名キー | はい |

`.env.local` に設定する。`.env.local` は `.gitignore` に含まれる。

## 9. npm スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 (http://localhost:3000) |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint によるコード検査 |
| `npm run test` | Jest による単体テスト実行 |
| `npm run test:watch` | Jest のウォッチモード |

## 10. アーキテクチャ設計方針

### 10.1 Server Component / Client Component の分離

- **Server Component:** データ取得を伴うページ (`dashboard/page.tsx`) はサーバー側で Supabase にアクセスし、初期 HTML にデータを含めて返す。
- **Client Component:** ユーザー操作を伴う部品 (ログインフォーム、チャート、ログアウトボタン) のみ `"use client"` として分離。

### 10.2 精算アルゴリズム

`src/lib/settlements.ts` に実装。グリーディ法により、債務者リストと債権者リストを金額降順にソートし、Two-Pointer 走査で最小送金回数の精算プランを生成する。0.5 円未満の端数は `ROUNDING_THRESHOLD` 定数により丸め誤差として吸収する。

### 10.3 セキュリティ考慮事項

- **オープンリダイレクト防止:** OAuth コールバックの `next` パラメータをバリデーションし、`/` で始まらないパスや `//` で始まるプロトコル相対 URL を拒否。
- **認証ガード:** Middleware により `/dashboard` 以下への未認証アクセスをブロック。
- **環境変数:** Supabase のキー情報は `.env.local` に格納し、リポジトリには含めない。

### 10.4 OAuth エラー: `validation_failed` / `provider is not enabled`

Supabase が `Unsupported provider: provider is not enabled` を返す場合、**ダッシュボードでそのプロバイダーがオフ**であることが多い。

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト
2. **Authentication** → **Providers**
3. 使用するプロバイダー（**Google**、**LINE** など）を有効化
4. 各 OAuth プロバイダーの開発者コンソールで取得した **Client ID / Client Secret**（およびリダイレクト URI の登録）を入力して保存
5. リダイレクト URI には `https://<project-ref>.supabase.co/auth/v1/callback` を登録する（プロバイダーによりアプリ側 URL も追加）

ログイン画面では上記に該当するエラーを検知し、日本語で案内を表示する（`src/lib/oauth-errors.ts`）。
