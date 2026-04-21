# SpliTrip（splitrip）

グループ旅行などの **割り勘・出費記録・精算（送金回数を減らすプラン）** を扱う **Web アプリ（PWA 想定）** です。

**English:** A **progressive web app** for **group travel expense splitting**, shared ledgers, and **debt-simplification settlements** (fewer transfers).

---

## 主な機能

- **認証:** Google（OAuth / PKCE）、LINE。
- **グループ:** 作成・招待（トークン / QR）・参加、メンバー表示、閲覧専用共有リンク（`public_share_token`）。
- **出費:** カテゴリ、均等 / 金額指定 / シェア / パーセント / 品目別、端数ポリシー、領収書ストレージ、コメント・監査ログ。
- **レシート AI:** Gemini による金額・説明・日付の候補抽出（無料枠あり、PRO は無制限）。
- **精算:** ネット残差からの送金プラン、送金先リンク（PayPal / Cash App 等）とファビコン表示。
- **書き出し:** CSV / PDF は **PRO**、ブラウザ印刷は無料でも利用可。
- **国際化:** **2 言語**（`ja`, `en`）。文言は `messages/ja.json` / `messages/en.json`（next-intl）。
- **フリーミアム:** `user_profiles.premium_access`。Stripe Checkout / Webhook で PRO 付与。

詳細な機能・API・運用メモは **[`docs/FEATURES.md`](docs/FEATURES.md)** を参照してください。DB スキーマの一覧は **[`docs/DATABASE_TABLES.md`](docs/DATABASE_TABLES.md)** です。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| フレームワーク | **Next.js 16**（App Router）、**React 19**、TypeScript |
| UI | Tailwind CSS、Radix / shadcn 系、Recharts、Framer Motion |
| バックエンド | **Supabase**（Postgres、Auth、RLS、Storage、Realtime） |
| i18n | **next-intl** |
| 課金 | **Stripe**（Webhook: `POST /api/webhook/stripe`） |
| OCR | **Google Gemini**（`@google/genai`） |

---

## ローカル開発

### 前提

- Node.js（プロジェクトに合わせた LTS 推奨）
- npm
- Supabase プロジェクト（URL / anon key。サーバー用途は service role 等は `.env` で管理）

### セットアップ

```bash
git clone https://github.com/Niboshi-Wasabi/SpliTrip.git
cd SpliTrip
npm install
```

ルートに **`.env.local`** を作成し、少なくとも次を設定します（名前は実装・環境に依存します。不足時はビルド・実行時エラーや `docs/FEATURES.md` を参照）。

| 変数（例） | 用途 |
|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe Webhook・サーバー専用処理など（クライアントに埋め込まない）。 |
| `NEXT_PUBLIC_SITE_URL` | 本番・プレビューで OAuth 等のオリジン解決（例: `https://splitrip.net`） |
| Google / LINE ログイン利用時 | Supabase・各コンソールのリダイレクト URL と整合させる（`LINE_CHANNEL_*`, `NEXT_PUBLIC_LINE_REDIRECT_URI` 等） |
| Stripe 利用時 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` 等 |
| Gemini OCR 利用時 | `GEMINI_API_KEY` |

DB スキーマは **`supabase/migrations`** の SQL を Supabase に適用してください。

### コマンド

```bash
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 本番ビルド
npm run start    # 本番サーバー
npm run lint     # ESLint
npm run test     # Jest
npm run security:scan # 5観点のセキュリティパターンスキャン
npm run icons:build  # PWA アイコン等の生成（`scripts/process-app-icon.mjs`）
```

### セキュリティスキャン（5観点）

`npm run security:scan` は、`node_modules` などを除外した上で以下のパターンを機械検出します。

1. 存在しない（`package.json` 未宣言の）外部パッケージ import
2. f-string 等での SQL 組み立て（主に Python パターン）
3. `except: pass` / `except Exception: pass`
4. ハードコードされたシークレット候補
5. ユーザー入力とファイルパス結合の危険候補

GitHub Actions でも `master` / `staging` への push と Pull Request で同じスキャンを自動実行します（`.github/workflows/security-scan.yml`）。

---

## 本番・デプロイ（概要）

- **想定ホスティング:** Vercel 等。カスタムドメイン例: **`https://splitrip.net`**（詳細は `docs/FEATURES.md` の「本番 URL・カスタムドメイン」）。
- **環境変数:** 本番・staging ごとに `NEXT_PUBLIC_SITE_URL`、OAuth コールバック、Stripe Webhook の `whsec_...` を揃えること。
- **ヘルスチェック:** `GET /api/health` — メンテナンス用プロキシの対象外で JSON を返します。

---

## ドキュメント・リポジトリ

| パス | 内容 |
|------|------|
| [`docs/FEATURES.md`](docs/FEATURES.md) | 機能一覧、API、メンテモード、Stripe 運用など |
| [`docs/DATABASE_TABLES.md`](docs/DATABASE_TABLES.md) | `public` スキーマの表・列の参照 |
| [`requirements.md`](requirements.md) | 要件メモ（存在する場合） |
| [`AGENTS.md`](AGENTS.md) | Next.js エージェント向け注意 |

リポジトリ: **https://github.com/Niboshi-Wasabi/SpliTrip**（`package.json` の `vercel:git:connect` スクリプトと整合）

---

## ライセンス

`package.json` は `"private": true` です。公開ライセンスはリポジトリのライセンスファイルまたは運用ポリシーに従ってください。
