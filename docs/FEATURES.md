# SpliTrip（splitrip）機能一覧

リポジトリに実装されているユーザー向け機能・API・基盤のスナップショットです。**新機能追加時は本ファイルを必ず更新してください**（`.cursor/rules/splitrip.mdc` 参照）。

---

## プロダクト概要

- **用途:** グループ旅行などの **割り勘・出費記録・送金回数を減らした精算プラン** を扱う **Web アプリ（PWA 想定）**。
- **マーケ LP:** 未ログインのトップ（`/`、`LandingPage`）に AI 訴求のヒーロー、差別化ポイント 6 件＋主要機能 4 件、フリーミアム料金（Free / PRO）、CTA。文言は `messages/*.json` の `Landing` 名前空間。
- **主な技術:** Next.js App Router、React、TypeScript、Tailwind CSS、Supabase（DB・認証・ストレージ）、`next-intl`（**日本語 / 英語**）。
- **ビジネスモデル（フリーミアム）:** `user_profiles.premium_access` が **PRO**。無料ユーザーは Gemini レシート OCR を **成功回数で上限（アプリ側で 3 回）**、CSV / PDF レポート出力はロック。プロモ枠は PRO で非表示。Stripe Checkout / Webhook で PRO 付与を連携。

---

## 認証・アカウント

| 機能 | 内容 |
|------|------|
| **Google ログイン** | OAuth（PKCE）。`/auth/callback` でコード交換・セッション確立。 |
| **LINE ログイン** | `/api/auth/line` → LINE → `/api/auth/callback/line` → `signInWithIdToken` 系のフロー。 |
| **ゲスト（匿名）** | Supabase 匿名サインイン。ブラウザセッション前提（データ消失リスクの注意表示あり）。 |
| **セッション維持** | ミドルウェアで Supabase セッション更新。`/dashboard`・`/settings` は未ログイン時にガード。 |
| **オンボーディング** | 初回表示名など（`/onboarding`）。 |
| **ピッチデッキ** | `/pitch` のスライド紹介。初回は `needs_pitch_deck` RPC 等で **閲覧必須ルート**になり得る。閲覧完了は `mark_pitch_deck_seen` / `POST /api/profile/pitch-deck-seen`。 |
| **ログアウト** | ダッシュボード周辺から利用可能。 |

---

## 国際化・UI 全般

| 機能 | 内容 |
|------|------|
| **ロケール** | `next-intl` で 14 言語（`ja`, `en`, `zh-CN`, `zh-TW`, `ko`, `es`, `fr`, `de`, `pt`, `ru`, `tr`, `ar`, `sw`, `hi`）をサポート。既定は `ja`。初回（`NEXT_LOCALE` 未設定）は Proxy で `Accept-Language` に加え、Vercel の `x-vercel-ip-country` または Cloudflare の `CF-IPCountry` を参照して言語を補正し、next-intl が適切なロケールへリダイレクト／書き換えする。**日本（JP）からのアクセス**で `Accept-Language` に `ja` が含まれない場合は、アラビア語など誤設定ヘッダーでも **日本語（`ja`）** を優先（`infer-locale-from-access.ts`）。`ja` を明示したヘッダは上書きしない。**デバイス UI 言語**は `navigator.languages` を Cookie `SPLITRIP_DEVICE_LANGS` に保存し、初回リクエスト以降は `Accept-Language` より先に交渉へ載せる。クライアントの `DeviceLocaleSync` が初回のみ URL ロケールをデバイスに合わせ、ユーザーが言語を手動変更したら `localStorage` / `sessionStorage` の `splitrip_locale_bootstrap_done` で自動合わせを止める。 |
| **UI フォント（本文・見出し）** | ラテン・キリルなど **アルファベット系コードポイント**は、Tiempos に近いオープンフォント **Source Serif 4**（`next/font/google`）をスタック先頭に置く。商用フォントの手動配置は不要。日本語・中国語・韓国語・アラビア語・ヒンディー等の本文は各 Noto Sans（`next/font`）と OS 標準フォントへフォールバックし、サンセリフ系のフォールバックから Geist Sans は除外。ロケール切替は `src/lib/i18n/locale-ui-fonts.ts` と `html[data-ui-sans]`。 |
| **等幅フォント** | `en` / `es` / `fr` / `de` / `pt` / `tr` / `sw` / `ru` は Fira Code 系スタック（キリル対応）。`ja` / `zh-CN` / `zh-TW` / `ko` は BIZ UD / Noto Sans Mono CJK 系などのサンセリフに近い等幅スタック。`ar` / `hi` は Noto Sans Mono ＋各スクリプト向け UI フォントをフォールバック。等幅の最終フォールバックも OS 標準 monospace に統一し、Geist Mono 依存は削除。`html[data-ui-mono]`。 |
| **言語スイッチャー** | `LanguageSwitcher`（セレクト）で 14 言語を即時切替。LP ヘッダー・設定ヘッダー等。LP 以外の画面では `GlobalLanguagePickerFab`（地球アイコン FAB）から **言語選択モーダル**（`language-picker-modal.tsx`）でも同様に切替可能。 |
| **テーマ** | ライト / ダーク / システム（クライアント側プロバイダ）。 |
| **モバイル** | ボトムナビ、タッチ向け `min-h-[44px]` などの UI 方針。 |
| **PWA** | `manifest.webmanifest`、テーマカラー等（レイアウト・メタと連動）。アイコン類は `public/icons/source-app-icon.png` を元に `npm run icons:build` で `public/icons/*` と `src/app/icon.png`・`apple-icon.png`・`favicon.ico` を生成。 |
| **What's New モーダル** | `localStorage.lastSeenUpdateVersion` と `src/config/changelog.ts` のバージョンを比較し、新機能がある初回アクセス時のみダッシュボード配下で表示。 |

---

## グループ（旅行単位）

| 機能 | 内容 |
|------|------|
| **グループ作成** | 名前・通貨コード。作成後 **招待トークン** 付きで即共有可能（ハイブリッド UX）。 |
| **グループ一覧** | ダッシュボードでグループ別支出サマリーへリンク。 |
| **グループ詳細** | `/dashboard/groups/[groupId]`：メンバー・アバター、通貨、招待、出費・グラフ・精算・エクスポートを一画面に集約。 |
| **公開 URL エイリアス** | `/groups/[id]` → 認証済みダッシュボードの同グループへリダイレクト（招待メール用など）。 |
| **招待** | `invite_token` ベースの `/join/[token]`。リンクコピー・共有・**QR 表示**。 |
| **参加** | ログイン済みは RPC で参加。未ログインは **Google / LINE / ゲスト参加**（`JoinGate`）。匿名参加時に **ゲストフラグ** を RPC で付与する流れあり。 |
| **メンバー** | 表示名・アバター。**ゲストメンバー**（`is_guest`）を区別可能。 |
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
| **ゲスト注意バナー** | 匿名利用時のデータ消失リスクの案内。 |

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
| **表示言語** | `preferred_language` 保存。フルリロードで反映。 |
| **送金先** | `payment_links` 等を API 経由で更新（マイグレーション未適用時はエラーメッセージ）。 |
| **PRO / OCR** | `premium_access`（PRO）、`ocr_usage_count`（無料の OCR 累計）。`increment_ocr_usage_if_not_premium` で成功後に加算。 |
| **支払い管理（PRO）** | Stripe 審査対応が完了するまで UI は一時的に **準備中（Coming Soon）**。課金基盤（Webhook / `premium_access` 判定）は将来再開に備えて保持。 |

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
| グループ | `POST /api/groups`、`GET/PATCH …/api/groups/[groupId]` |
| 出費 | `POST/GET …/expenses`、`GET/PATCH/DELETE …/expenses/[expenseId]` |
| 領収書 | `…/expenses/[expenseId]/receipt` |
| コメント | `…/expenses/[expenseId]/comments`（GET/POST） |
| 監査 | `…/expenses/[expenseId]/audit` |
| プロフィール | `display-name`、`payment-methods`、`pitch-deck-seen` |
| 決済 Webhook | `POST /api/webhook/stripe` — `checkout.session.completed` を検証し `user_profiles.premium_access=true` を反映 |
| 通知（枠） | `POST /api/notifications/web-push` — **未実装のプレースホルダー（例: 501）** |

---

## Stripe Webhook 運用（local / staging / master）

| 項目 | 内容 |
|------|------|
| **共通の実装** | `POST /api/webhook/stripe` が `checkout.session.completed` を検証し、`user_profiles.premium_access=true` を反映。`client_reference_id` / `metadata.user_id` が利用される想定。 |
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
| **開発者支援** | `SupportDeveloper`（環境変数で寄付リンクを有効化可能な想定）。 |
| **ヘルプ** | 割り方などに **「?」ツールチップ**（`HelpHint` + i18n）。 |
| **ランディングページ（LP）** | 未ログイン時のトップ（`/[locale]`）にヒーロー・機能紹介・CTA を配置。`framer-motion` で Fade Up / Stagger の導入。 |

---

## 開発・品質

| 項目 | 内容 |
|------|------|
| **テスト** | Jest（ユニット・コンポーネントテストが存在）。 |
| **DB** | `supabase/migrations` にスキーマ・RLS・RPC の定義（本番は Supabase へ適用が前提）。 |

---

## 補足

- **Web Push** は API に **基盤のプレースホルダー**があり、エンドユーザー向けの本番通知フローは **未完了** と見なすのが安全です。
- 文言・ラベルは **`messages/ja.json` / `en.json`** を中心に管理されています。
