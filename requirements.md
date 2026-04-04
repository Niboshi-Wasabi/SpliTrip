# アプリケーション仕様書：TabiPay (タビペイ)

## 1. プロジェクト概要

グループ旅行中のお金の立替をリアルタイムに記録し、「誰が誰にいくら払うか」を自動計算・可視化するWebアプリ（PWA）。

## 2. ユーザー認証・アカウント要件

- **対応プロバイダ:** Google, LINE, X (旧Twitter)
- **認証基盤:** Supabase Auth を使用

## 3. 機能要件

### 3.1 グループ管理
- 旅行の作成
- URLによる招待
- メンバー一覧表示

### 3.2 支出記録
- 金額、内容、支払者、対象者、カテゴリの入力
- Supabase Realtime で即時反映

### 3.3 ダッシュボード
- Recharts を使用した総支出とカテゴリ別支出割合（ドーナツチャート）の可視化

### 3.4 精算実行
- 送金回数が最小になるアルゴリズムでの計算

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

| カテゴリ | 技術 |
| --- | --- |
| Frontend | Next.js (App Router), Tailwind CSS |
| UI Components | shadcn/ui, Lucide React |
| Charts | Recharts |
| Backend / DB | Supabase (PostgreSQL) |
| Testing | Jest, React Testing Library |

## 5. データモデル (Supabase PostgreSQL)

### 5.1 `profiles`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | ユーザーID (auth.users.id) |
| display_name | text | 表示名 |
| avatar_url | text | アバター画像URL |
| payment_link | text | 送金URL (PayPay / LINE Pay 等) |
| created_at | timestamptz | 作成日時 |

### 5.2 `groups`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | グループID |
| name | text | グループ名 |
| created_at | timestamptz | 作成日時 |
| owner_id | uuid (FK → profiles.id) | オーナーID |

### 5.3 `group_members`
| カラム | 型 | 説明 |
| --- | --- | --- |
| group_id | uuid (FK → groups.id) | グループID |
| user_id | uuid (FK → profiles.id) | ユーザーID |
| joined_at | timestamptz | 参加日時 |

### 5.4 `expenses`
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid (PK) | 支出ID |
| group_id | uuid (FK → groups.id) | グループID |
| payer_id | uuid (FK → profiles.id) | 支払者ID |
| amount | numeric | 金額 |
| description | text | 内容 |
| category | text | カテゴリ |
| split_details | jsonb | 割り勘の詳細 |
| created_at | timestamptz | 作成日時 |
