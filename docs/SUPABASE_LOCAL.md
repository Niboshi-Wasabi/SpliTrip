# Supabase ローカル連携（CLI）

リポジトリには `supabase/config.toml` と `supabase/migrations/` があり、Supabase CLI で **リモートプロジェクトとリンク**したり、**Docker でローカルスタック**を起動できます。

## 前提

- Node.js（`npm` が使えること）
- リモート連携: [Supabase CLI](https://supabase.com/docs/guides/cli)（本プロジェクトでは `devDependencies` の `supabase` を `npm run supabase -- …` で実行）
- `supabase start`（ローカル DB 等）: **Docker Desktop**（Windows では通常必須）

## 1. CLI ログイン（初回・トークン期限切れ時）

```bash
npm run supabase:login
```

ブラウザで Supabase にログインし、CLI とアカウントを紐づけます。

## 2. リモートプロジェクトとリンク（推奨）

`.env.local` の `NEXT_PUBLIC_SUPABASE_URL` が  
`https://fdfwnoaqdlfiywtggsfi.supabase.co` の場合、**project ref** は `fdfwnoaqdlfiywtggsfi` です（別プロジェクトのときは Dashboard の URL から ref を確認し、`package.json` の `supabase:link` の `--project-ref` を合わせるか、下記のように上書きしてください）。

**Database のパスワード**は Supabase Dashboard → **Project Settings → Database** の「Database password」（設定した値、または Reset で再発行）。

PowerShell の例（パスワードはダッシュボードの値に置き換え）:

```powershell
npm run supabase:link -- -p "YOUR_DATABASE_PASSWORD"
```

リンク後、`supabase db pull` / `supabase db push` でリモートとマイグレーションを同期できます。

- **`db push`**: ローカルの `supabase/migrations/` をリモートに適用（本番反映前にバックアップ・確認推奨）
- **`db pull`**: リモートのスキーマ差分をローカルに取り込み（新規ファイル生成の有無は CLI の挙動に従う）

## 3. ローカルで Supabase スタックを起動（任意）

Docker が動いている状態で:

```bash
npm run supabase:start
```

API は `config.toml` のとおり（既定 `http://127.0.0.1:54321`）、Postgres は `54322` 付近です。停止は `npm run supabase:stop`。状態確認は `npm run supabase:status`。

ローカル用の URL/anon key は `npm run supabase:status` の出力を参照し、開発時に `.env.local` を切り替えて使います（リモートとローカルは別プロジェクト扱い）。

## 4. 補足

- `supabase init` 済みのため、`supabase/seed.sql` は空のプレースホルダです。`db reset` でシードが必要ならここに SQL を追加します。
- `supabase/.temp` は CLI の作業用で、`.gitignore` 済みです。
