# SpliTrip（splitrip）機能一覧

リポジトリに実装されているユーザー向け機能・API・基盤のスナップショットです。**新機能追加時は本ファイルを必ず更新してください**（`.cursor/rules/splitrip.mdc` 参照）。

---

## プロダクト概要

- **用途:** グループ旅行などの **割り勘・出費記録・送金回数を減らした精算プラン** を扱う **Web アプリ（PWA 想定）**。
- **マーケ LP:** トップ（`/`、`LandingPage`）に AI 訴求のヒーロー、差別化ポイント 6 件＋主要機能 4 件、フリーミアム料金（Free / PRO）、CTA。**ログイン済みセッションをLP上でも保持**し、ヘッダー導線をログイン→アカウントアイコン＋ダッシュボード導線へ切り替える。ログイン後はアバターメニューから **ダッシュボード / 設定 / ログアウト** へ遷移可能。One Tap 成功時は LP をリロードして同一ページ上で導線を更新。文言は `messages/*.json` の `Landing` / `LandingV2` 名前空間。
- **主な技術:** Next.js App Router、React、TypeScript、Tailwind CSS、Supabase（DB・認証・ストレージ）、`next-intl`（**日本語 / 英語**）。
- **ビジネスモデル（フリーミアム）:** `user_profiles.premium_access` が **PRO**（付与根拠は `premium_access_source`: `none` / `stripe` / `manual`）。無料ユーザーは Gemini レシート OCR を **成功回数で上限（アプリ側で 3 回）**、CSV / PDF レポート出力はロック。プロモ枠は PRO で非表示。Stripe Checkout / Webhook で `stripe` を付与。運営による個別付与は **Supabase SQL Editor** で `manual` に更新（手順は下記「PRO 手動付与」）。
- **本番の想定オリジン（カスタムドメイン）:** `https://splitrip.net`（Cloudflare で DNS 管理）。アプリ内の OAuth `redirectTo` 等は `getPublicSiteOrigin()`（`src/utils/public-site-url.ts`）が **`NEXT_PUBLIC_SITE_URL`** を優先するため、**本番・staging の Vercel（等）環境変数に必ず設定**すること。未設定のサーバー環境ではオリジンが空になりログイン周りが壊れ得る。

---

## 本番 URL・カスタムドメイン（splitrip.net）

コードに旧ドメインの固定文字列は置かず、**ホスティングの環境変数と各種コンソール**で本番 URL を揃える運用です。切り替え時は **DNS が新ホストを指してから** Vercel の Production にドメインを載せ、**証明書が有効になったあと**に OAuth / Stripe の URL を更新すると安全です。

| 作業場所 | 内容 |
|----------|------|
| **Cloudflare DNS** | ホスティング先（例: Vercel）の指示に従い、`splitrip.net`（および使うなら `www`）に **A / CNAME / ドメイン検証用 TXT** を設定。`www` を使う場合は **apex へのリダイレクト** か **両方を Vercel に追加** のどちらかに統一する。 |
| **Vercel（例）** | プロジェクトの **Production ドメイン** に `splitrip.net` を追加し、SSL が **Ready** になるまで待つ。旧 `*.vercel.app` は当面残してもよいが、ユーザー向けリンクは新ドメインへ寄せる。 |
| **Vercel 環境変数（本番）** | `NEXT_PUBLIC_SITE_URL` = `https://splitrip.net`（末尾スラッシュなしで可。`new URL(...).origin` で正規化される）。LINE 利用時は `NEXT_PUBLIC_LINE_REDIRECT_URI` = `https://splitrip.net/api/auth/callback/line`（**LINE Developers のコールバック URL と完全一致**）。変更後は **再デプロイ**。 |
| **Supabase** | **Authentication → URL Configuration**: **Site URL** を `https://splitrip.net` に。**Redirect URLs** に `https://splitrip.net/**` および `https://splitrip.net/auth/callback` 等、実際に使うパスを追加（移行期間は旧ドメインも残してよい）。 |
| **Google Cloud Console** | OAuth クライアントの **承認済みリダイレクト URI** に、Supabase の `.../auth/v1/callback` と、アプリが使う URL があれば追加（プロジェクトの Google ログイン設定に準拠）。 |
| **LINE Developers** | チャネルの **Callback URL** を `https://splitrip.net/api/auth/callback/line` に合わせる（`NEXT_PUBLIC_LINE_REDIRECT_URI` と一致必須）。 |
| **Stripe** | 本番用 **Webhook エンドポイント** を `https://splitrip.net/api/webhook/stripe` に作成または更新し、発行された **`whsec_...`** を本番の `STRIPE_WEBHOOK_SECRET` に設定。Payment Link / Customer Portal はダッシュボード上の URL がドメイン非依存なら変更不要なことが多いが、**成功時のリダイレクト先**を固定 URL にしている場合は要確認。 |

---

## メンテナンス・事前告知

| 項目 | 内容 |
|------|------|
| **全画面メンテ** | `MAINTENANCE_MODE` または `NEXT_PUBLIC_MAINTENANCE_MODE` を `true` / `1` / `yes` にすると、`src/proxy.ts` が **OAuth 用 `/auth/*` 通過後**に一般ページを **`/maintenance` または `/{locale}/maintenance`** へ **302 リダイレクト**。メンテページは `messages` の `Maintenance` 名前空間。`robots`: noindex。 |
| **ミドルウェア対象外** | `matcher` により **`/api/*` は `proxy` 未実行**（API・Webhook は従来どおり。監視用 **`GET /api/health`** は常時 200 JSON）。 |
| **事前告知バナー** | `NEXT_PUBLIC_MAINTENANCE_ANNOUNCEMENT` に任意の一文を入れると、**メンテモードの有無に関わらず** `[locale]/layout` 上部にアンバー帯で表示（本文は環境変数のまま。ラベルは i18n）。 |
| **アプリ内お知らせ（DB）** | 管理画面で `app_announcements` に保存した内容のうち公開中の最新 1 件を対象に、ログインユーザーの `user_profiles.last_seen_announcement_id` と比較して未読時のみ **ブラー付きオーバーレイ（What's New モーダル）** を表示。確認ボタンで `POST /api/profile/last-seen-announcement` を呼び、既読化後は再表示しない。未公開（下書き）は RLS で一般ユーザーから参照不可。**公開期限（`expires_at`）** を設定した場合は期限切れ後にヘッダー表示・モーダル表示の両方から自動除外される。文言はロケールに応じて `title_ja` / `title_en` 等を切替。 |

---

## 認証・アカウント

| 機能 | 内容 |
|------|------|
| **Google ログイン** | OAuth（PKCE）。`/auth/callback` でコード交換・セッション確立。 |
| **Google One Tap** | 未ログイン LP（`/[locale]`）で `https://accounts.google.com/gsi/client` を読み込み、右上プロンプトからワンタップ認証。`response.credential` を `supabase.auth.signInWithIdToken({ provider: 'google', token })` に渡してセッション化し、成功時は `/{locale}/dashboard` へ遷移。`NEXT_PUBLIC_GOOGLE_CLIENT_ID` が必須。 |
| **LINE ログイン** | `/api/auth/line` → LINE → `/api/auth/callback/line` → サービスロール＋`verifyOtp` 相当でセッション確立。 |
| **二段階認証（WebAuthn）** | **必須フローではない（当面オフ）**。ミドルウェアの 2FA 未完了リダイレクトは **無効化**（`src/utils/supabase/middleware.ts` 内の該当ブロックはコメントアウト）。`/{locale}/auth/2fa` は **旧URL互換**として `next` 等へ即リダイレクトするのみ。WebAuthn / バックアップ用 **Route Handler・DB スキーマ（`user_webauthn_credentials` 等）は存続**するが、ログイン直後の強制 2FA は行わない。`getWebAuthnRpId`（`src/lib/auth/two-factor.ts`）は **リクエスト origin の hostname** を `rpId` に使う（`localhost` / `127.0.0.1` はそのまま）。PWA: `AppPerformanceEnhancer` が `public/service-worker.js` を `'/service-worker.js'` で登録（旧 `'/sw.js'` は解除）。 |
| **2FA 復旧** | 初回登録時にバックアップコードを発行する API・DB ロジックは存続。設定画面の **2FA 管理フォーム（`TwoFactorSettingsForm`）はコメントアウト**しており、UI からの再発行導線は非表示。コードはハッシュ化して `used_at` で再利用不可。 |
| **Turnstile（Cloudflare CAPTCHA）** | ログイン画面・招待ゲートで有効化可能。`NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` / `CLOUDFLARE_TURNSTILE_SECRET_KEY` が揃うと有効化され、LINE開始前にはサーバー側でも検証。 |
| **セッション維持とガード** | プロキシ（`src/proxy.ts`）＋ `finalizeSupabaseSession` 等で Supabase セッション更新。`/dashboard`・`/settings`（ロケール接頭辞を除いたパス基準）で **未ログイン時** は `/` 等へ制御。2FA 未完了リダイレクトは**行わない**。 |
| **オンボーディング** | 初回表示名など（`/onboarding`）。表示名は **最大 50 文字**（`DISPLAY_NAME_MAX_LENGTH`、フォーム `maxLength` と `PATCH /api/profile/display-name` の共通検証）。 |
| **アバター（頭文字）** | プロフィール画像がない場合、`UserAvatar` が表示名から `stringToColor` で **決定論的なパステル背景**と **コントラストの前景色**（相対輝度に基づく）を適用。 |
| **ピッチデッキ** | `/pitch` のスライド紹介。初回は `needs_pitch_deck` RPC 等で **閲覧必須ルート**になり得る。閲覧完了は `mark_pitch_deck_seen` / `POST /api/profile/pitch-deck-seen`。 |
| **ログアウト** | ダッシュボード周辺から利用可能。 |

---

## 国際化・UI 全般

| 機能 | 内容 |
|------|------|
| **ロケール** | `next-intl` で **2 言語（`ja`, `en`）** をサポート。既定は `ja`。初回（`NEXT_LOCALE` 未設定）は Proxy で `Accept-Language` と国コードを参照して言語を補正し、next-intl が適切なロケールへリダイレクト／書き換えする。**日本（JP）からのアクセス**で `Accept-Language` に `ja` が含まれない場合は **日本語（`ja`）** を優先（`infer-locale-from-access.ts`）。`ja` を明示したヘッダは上書きしない。**デバイス UI 言語**は `navigator.languages` を Cookie `SPLITRIP_DEVICE_LANGS` に保存し、初回リクエスト以降は `Accept-Language` より先に交渉へ載せる。クライアントの `DeviceLocaleSync` が初回のみ URL ロケールをデバイスに合わせ、ユーザーが言語を手動変更したら `localStorage` / `sessionStorage` の `splitrip_locale_bootstrap_done` で自動合わせを止める。 |
| **UI フォント（本文・見出し）** | アルファベット系コードポイントは **Source Serif 4**、日本語は **Noto Serif JP** を優先。ロケール切替は `src/lib/i18n/locale-ui-fonts.ts` と `html[data-ui-sans]` で `ja/en` を扱う。 |
| **等幅フォント** | `ja` / `en` ともに Fira Code 系スタックを利用（最終フォールバックは OS 標準 monospace）。`html[data-ui-mono]`。 |
| **言語スイッチャー** | `LanguageSwitcher` は **JA / EN トグル**で即時切替。LP ヘッダー・設定ヘッダー等。LP 以外の画面では `GlobalLanguagePickerFab`（地球アイコン FAB）から **言語選択モーダル**（`language-picker-modal.tsx`）でも同様に切替可能。 |
| **テーマ** | ライト / ダーク / システム（クライアント側プロバイダ）。 |
| **モバイル** | ボトムナビ、タッチ向け `min-h-[44px]` などの UI 方針。 |
| **PWA** | `manifest.webmanifest`、テーマカラー等（レイアウト・メタと連動）。アイコン類は `public/icons/icon.svg` を元に `npm run icons:build` で `public/icons/*` と `src/app/icon.png`・`apple-icon.png`・`favicon.ico` を生成。 |
| **What's New モーダル** | `src/components/ui/WhatsNewModal.tsx` + `src/components/announcements/whats-new-modal-gate.tsx` で有効。`[locale]/layout` にマウントされ、背景ブラー・Fade/Scale アニメーション付きで表示。 |

---

## グループ（旅行単位）

| 機能 | 内容 |
|------|------|
| **グループ作成** | 名前・通貨コード。作成後 **招待トークン** 付きで即共有可能（ハイブリッド UX）。 |
| **グループ一覧** | ダッシュボードでグループ別支出サマリーへリンク。 |
| **グループ詳細** | `/dashboard/groups/[groupId]`：メンバー・アバター、通貨、招待、出費・グラフ・精算・エクスポートを一画面に集約。 |
| **公開 URL エイリアス** | `/groups/[id]` → 認証済みダッシュボードの同グループへリダイレクト（招待メール用など）。 |
| **招待** | `invite_token` ベースの `/join/[token]`。リンクコピー・共有・**QR 表示（モーダル / 背景ブラー）**。 |
| **参加** | ログイン済みは RPC で参加。未ログインは **Google / LINE**（`JoinGate`）。 |
| **メンバー** | 表示名・アバター。 |
| **閲覧専用共有** | `/groups/[id]/shared?t=…` — ログイン不要。**`public_share_token` と一致する `t`** で RPC 経由のサマリー表示。 |

---

## 出費

| 機能 | 内容 |
|------|------|
| **出費の追加** | 支払人、金額、説明、日付、**カテゴリ**（食費・交通・宿泊・観光・その他 等）。 |
| **割り方（スプリット）** | **均等 / 金額指定 / シェア比率 / パーセント / 品目別（項目行）**。端数は **端数ポリシー**（公平な端数配分・支払人負担・特定メンバー・先頭順など）を UI で選択。 |
| **DB 連携** | `split_type`・`expense_splits` 等で負担行を保持（API・マイグレーションと整合）。 |
| **出費一覧** | テーブル表示、カテゴリ・日付・金額など。 |
| **出費詳細** | モーダル：**領収書**、**削除**、**監査ログ**、**コメント投稿・一覧**（API 経由）。 |
| **レシート AI** | 画像を Gemini で解析する **Server Action**（金額・説明・日付の候補をフォームに流し込み。自動保存はしない）。**無料は成功ごとに `ocr_usage_count` を加算し上限に達するとブロック**（PRO は無制限）。 |
| **領収書ファイル** | Storage 連携の API（アップロード・署名 URL 表示など）。 |
| **リアルタイム** | Supabase の変更通知＋ブロードキャストで **他ユーザーの更新トースト**、グループ画面の再取得連携。 |

---

## 精算・送金支援

| 機能 | 内容 |
|------|------|
| **精算プラン** | ネット残高から **送金回数を減らす** グリーディな突合（`simplify-debts` / グループ台帳と連携）。 |
| **精算一覧 UI** | 「誰から誰へいくら」表示。ログインユーザーが **支払う側** の行に **送金ボタン**。 |
| **送金先リンク** | プロフィールの **`payment_links`（JSONB）** 等から URL を解決。**ドメインからファビコン**を表示、失敗時は汎用アイコン。サービス名が分かる場合は **「○○で送金」** 風のラベル。 |
| **次は誰が払う？** | 残高目安に基づく **次の会計担当のヒント** カード。 |
| **通貨・換算** | 基準通貨が JPY 以外のとき **参考レート表示**（取得失敗時はメッセージ）。 |

---

## ダッシュボード・可視化

| 機能 | 内容 |
|------|------|
| **統計カード** | 総支出・グループ数・グループあたり平均など。 |
| **支出グラフ** | **グループ別** / **カテゴリ別** の切替（Recharts）。グループ内でも **支払った人別 / カテゴリ別** の円グラフ。 |

---

## 書き出し・印刷

| 機能 | 内容 |
|------|------|
| **CSV** | 出費・負担内訳・精算行など BOM 付きエクスポート。**PRO のみ**（無料はペイウォール＋アップグレードモーダル）。 |
| **印刷** | ブラウザ印刷（**無料でも利用可**）。 |
| **PDF レポート** | Canvas にレポートを描画 → JPEG → jsPDF で 1 ファイル。**PRO のみ**（PNG 画像書き出しは廃止）。 |
| **印刷用ヘッダ** | 印刷日時・グループ名など。 |

---

## プロフィール・設定

| 機能 | 内容 |
|------|------|
| **表示名** | 設定・ダッシュボード・プロンプトコンポーネントから変更。API: `PATCH /api/profile/display-name`。 |
| **表示言語** | `preferred_language` は `ja` / `en` のみを保存。フルリロードで反映。 |
| **送金先** | `payment_links` 等を API 経由で更新（マイグレーション未適用時はエラーメッセージ）。 |
| **PRO / OCR** | `premium_access`（PRO）、`premium_access_source`（`stripe`＝課金、`manual`＝運営付与）、`ocr_usage_count`（無料の OCR 累計）。認証ユーザーが自分の PRO フラグだけを書き換えることは DB トリガーで拒否。`increment_ocr_usage_if_not_premium` で成功後に加算。 |
| **支払い管理（PRO）** | Stripe 審査対応が完了するまで UI は一時的に **準備中（Coming Soon）**。課金基盤（Webhook / `premium_access` 判定）は将来再開に備えて保持。 |
| **管理画面（Admin Control Panel Suite）** | `user_profiles.is_admin = true` のユーザーのみ `/{locale}/admin` にアクセス可能。`proxy.ts` で非管理者はダッシュボードへリダイレクト。**Step-Up 再認証（任意）**: 環境変数 **`ADMIN_STEP_UP_ENABLED=true`** のときのみ、一部管理 API で `requireAdminStepUpOrJson` により **`admin_stepup_verified` Cookie** を要求。未設定のときは要求しない（デフォルト）。**基盤**: `admin_audit_logs`、`app_announcements`、 `system_settings` テーブル。**管理スイート**: タブ形式UI（`AdminAppShell`、各タブに色分けアイコン）で統合。トップは `listAdminUsers` を1回呼び、概要KPI＋ユーザーテーブルに同じデータを使う。`**GET /api/admin/users` はセッションで `is_admin` を検証**したうえで Service Role 経由の一覧取得。**ユーザー削除（管理）**: Users タブで警告モーダル確認後に削除実行（`POST /api/admin/users/[userId]/delete`）。削除されたユーザーは `user_profiles.deleted_at` を持ち、`proxy.ts` で `/{locale}/account-deleted` に誘導。**お知らせ（管理）**: トピック別タブ＋ライブプレビュー。公開済み（`is_published`）行は RLS で一般も SELECT 可。**エンドユーザー向け表示**は `[locale]/layout` の `WhatsNewModalGate`（未読時のみ表示）。**API**: `GET/POST /api/admin/announcements`、 `GET/POST/PATCH/DELETE` 他、`GET /api/admin/audit-logs` 等。**セキュリティ**: 管理操作は `admin_audit_logs` 等。2FA 用監査 `two_factor_security_events` は **ユーザー向け 2FA API** 向け。 |

### PRO 手動付与

**方法 A（アプリ）:** 管理者は **`/{locale}/admin`** を開き、**「PRO を付与」/「PRO を解除」**（解除は確認ダイアログ）が可能。履歴は **`/{locale}/admin/audit-logs`**。

**方法 B（Supabase SQL）:** **Supabase Dashboard → SQL → New query** で次を実行する（**`auth.users` の UUID** と `user_profiles.id` は同一）。認証ユーザーによるクライアントからの自己昇格は DB トリガーで拒否される。

**付与:**

```sql
update public.user_profiles
set premium_access = true,
    premium_access_source = 'manual'
where id = '<ユーザーUUID>';
```

**解除:**

```sql
update public.user_profiles
set premium_access = false,
    premium_access_source = 'none'
where id = '<ユーザーUUID>';
```

`user_profiles` に行がまだ無いユーザーは、一度ログイン等で行が作成されたあとに実行する。

---

## 法務・情報

| 機能 | 内容 |
|------|------|
| **利用規約** | `/terms`（i18n 本文）。 |
| **プライバシーポリシー** | `/privacy`。 |
| **特定商取引法に基づく表記** | `/commerce`。有料プラン（SpliTrip PRO）の販売事業者情報、価格、支払時期、解約等を掲載。 |
| **ログイン画面** | 規約・プライバシーへの同意文言。 |

---

## API（Route Handlers の主なもの）

| 領域 | エンドポイント例 |
|------|------------------|
| 2FA（WebAuthn / Backup） | `GET /api/auth/2fa/status`、`POST` … 各種（**コードは存続。ログイン直後の強制2FAはオフ**） |
| 管理 | `GET /api/admin/users`（一覧）、`GET /api/admin/audit-logs`；`POST /api/admin/users/[userId]/grant-pro` / `revoke-pro` / `sync-stripe` 等。管理者＋`is_admin` 検証（`GET /api/admin/users`）。 |
| グループ | `POST /api/groups`、`GET/PATCH …/api/groups/[groupId]` |
| 出費 | `POST/GET …/expenses`、`GET/PATCH/DELETE …/expenses/[expenseId]` |
| 領収書 | `…/expenses/[expenseId]/receipt` |
| コメント | `…/expenses/[expenseId]/comments`（GET/POST） |
| 監査 | `…/expenses/[expenseId]/audit` |
| プロフィール | `display-name`、`payment-methods`、`pitch-deck-seen` |
| 決済 Webhook | `POST /api/webhook/stripe` — 署名検証後に `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` を処理。`stripe_webhook_events` で **event.id の重複処理を防止**し、`stripe_customer_user_links` で customer と user を紐付けて `premium_access` / `premium_access_source` を更新（`display_name` は上書きしない）。 |
| ヘルス | `GET /api/health` — `{ ok: true }`（メンテ中も利用可・`proxy` 対象外） |
| 通知（枠） | `POST /api/notifications/web-push` — **未実装のプレースホルダー（例: 501）** |

---

## Stripe Webhook 運用（local / staging / master）

| 項目 | 内容 |
|------|------|
| **共通の実装** | `POST /api/webhook/stripe` が `checkout.session.completed` で PRO 付与、`customer.subscription.updated/deleted` で状態同期を行う。`stripe_webhook_events` に `event_id` を記録して冪等化し、`stripe_customer_user_links` で customer→user 紐付けを維持。 |
| **必須環境変数（全環境）** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`（PRO 購入の Payment Link URL）, `STRIPE_CUSTOMER_PORTAL_URL`（設定画面の Portal リンクを使う場合）。 |
| **local 再現** | `stripe listen --forward-to localhost:3000/api/webhook/stripe` で表示される `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定し、`npm run dev` を再起動。 |
| **staging / master 再現** | Stripe Dashboard で各環境 URL の Webhook endpoint を作成し、環境ごとに発行された `whsec_...` をデプロイ環境変数へ設定（同じ secret の使い回しはしない）。 |
| **CLI 検証コマンド** | `stripe trigger checkout.session.completed`（疎通確認）。本番同等の検証は Payment Link 経由で `checkout.session.completed` を発火させる。 |
| **運用注意** | Stripe CLI の `stripe login` 認証キーは期限があるため、期限切れ時は再ログインが必要。 |

---

## 補助・将来用 UI

| 機能 | 内容 |
|------|------|
| **プロモ枠** | `PromoBanner`（提携・広告用のプレースホルダー）。 |
| **開発者支援** | `SupportDeveloper`（`NEXT_PUBLIC_SUPPORT_DEVELOPER_URL` で有効化）。設定時はダッシュボードヘッダー中央（`md` 以上）に `variant="header"`、設定画面・ボトムナビにも表示。未設定時はヘッダー枠は出さない。 |
| **ヘルプ** | 割り方などに **「?」ツールチップ**（`HelpHint` + i18n）。 |
| **ランディングページ（LP）** | 未ログイン時のトップ（`/[locale]`）にヒーロー・機能紹介・CTA を配置。`framer-motion` で Fade Up / Stagger の導入。 |

---

## 開発・品質

| 項目 | 内容 |
|------|------|
| **テスト** | Jest（ユニット・コンポーネントテストが存在）。 |
| **DB** | `supabase/migrations` にスキーマ・RLS・RPC の定義（本番は Supabase へ適用が前提）。 |
| **Supabase CLI** | リポジトリに `supabase`（CLI）を `devDependencies` 登録。`npm run db:login` → `npm run db:link -- --project-ref <ref>` → `npm run db:push` でリモート DB にマイグレーションを適用。適用状況の確認は `npm run db:migration:list`。 |
| **Vercel 計測** | `src/app/layout.tsx` で `@vercel/analytics/next` の `<Analytics />` と `@vercel/speed-insights/next` の `<SpeedInsights />` を有効化。 |
| **セキュリティスキャン（CI）** | `npm run security:scan` で 5観点（未知import / f-string SQL / `except: pass` / ハードコード秘密 / 入力パス結合）を機械検出。GitHub Actions（`.github/workflows/security-scan.yml`）で `master` / `staging` push と PR 時に自動実行。 |

### 2FA 関連の DB 追加（2026-04）

- `user_profiles.two_factor_enabled`（boolean）、`user_profiles.is_admin`（管理者フラグ）
- `user_webauthn_credentials`（WebAuthn 資格情報）
- `user_backup_codes`（バックアップコードのハッシュ管理）
- `two_factor_security_events`（2FA 成功/失敗監査イベント）— **ユーザー向け 2FA API** の監査用
- `admin_audit_logs`（管理者操作の監査ログ、管理者のみRLS SELECT可）
- 2FA verify API には **IP + user 単位の簡易レート制限**（失敗回数ベース）を適用（**API は存続。アプリ主導の「ログイン直後2FA必須」はオフ**）

### Supabase CLI でリモートにマイグレーションを当てる

1. **Project ref**  
   `NEXT_PUBLIC_SUPABASE_URL` が `https://<ref>.supabase.co` なら `<ref>` が ref（例: `fdfwnoaqdlfiywtggsfi`）。
2. **DB パスワード**  
   Supabase Dashboard → **Project Settings → Database** の **Database password**（リンク時に CLI が要求する。リポジトリにコミットしない）。
3. **コマンド例（リポジトリルート）**
   - `npm run db:login`（初回のみ）
   - `npm run db:link -- --project-ref <ref>`（パスワードを聞かれたら上記を入力）
   - `npm run db:push`
4. **staging / 本番で DB を分ける場合**  
   プロジェクトごとに ref が異なる。**リンク先を切り替えるたびに** `db:link` をやり直し、その ref に対して `db:push` する（同じ `supabase/migrations` を両方に適用する運用）。

---

## 補足

- **Web Push** は API に **基盤のプレースホルダー**があり、エンドユーザー向けの本番通知フローは **未完了** と見なすのが安全です。
- 文言・ラベルは **`messages/ja.json` / `en.json`** を中心に管理されています。
- **Next.js 16（本リポジトリ）** のエッジ前処理のエントリは **`src/proxy.ts` の `default` エクスポート**（`proxy` ファイル）。プロジェクトルートの `middleware.ts` とは **併用不可**（公式メッセージ通り、片方に統一）。

---

## パフォーマンス最適化

### リアルタイムデータ同期
- **SWR + Realtime統合**: Supabase RealtimeとSWRの統合によるリアルタイムキャッシュ更新
- **WebSocket管理**: 自動再接続、デバウンス処理、エラーハンドリング
- **リアルタイム通知**: データ更新時のトースト通知システム
- **オフライン対応**: ネットワーク状態監視とオフライン時の通知

### キャッシュ戦略
- **SWR**: クライアント側データキャッシュとstale-while-revalidate
- **API Cache-Control**: 応答ヘッダーによるブラウザキャッシュ制御
- **Prefetch**: ホバー時のページ先読み、アイドル時のリソース先読み
- **Realtime Cache Sync**: リアルタイムイベントによる自動キャッシュ無効化

### 読み込み最適化
- **Loading Skeletons**: データ読み込み中のプレースホルダー表示
- **Optimized Links**: 自動prefetch付きLinkコンポーネント
- **Context-aware Prefetching**: 現在ページに基づく関連ページの先読み
- **Performance Monitor**: API応答時間、キャッシュヒット率、メモリ使用量の監視

### 実装ファイル
- `src/hooks/useSWRWithRealtime.ts`: SWRとRealtime統合フック
- `src/hooks/useGroupData.ts`: グループデータ管理フック
- `src/components/realtime/realtime-sync-provider.tsx`: リアルタイム同期プロバイダー
- `src/lib/performance/performance-monitor.ts`: パフォーマンス監視システム
- `src/components/admin/performance-dashboard.tsx`: 管理画面パフォーマンス監視
