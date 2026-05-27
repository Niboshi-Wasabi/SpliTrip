/**
 * Apple.com 風デザインシステム（LP〜アプリ共通）
 */

/** LP ヒーロー見出し */
export const APPLE_HERO_TITLE_CLASS =
  "font-sans text-[48px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--apple-text)] md:text-[64px] lg:text-[80px]";

/** LP セクション見出し */
export const APPLE_SECTION_TITLE_CLASS =
  "font-sans text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--apple-text)] md:text-[56px]";

/** アプリ Large Title */
export const APPLE_LARGE_TITLE_CLASS =
  "font-sans text-[34px] font-bold leading-tight tracking-[-0.02em] text-[var(--apple-text)]";

/** ナビゲーションタイトル */
export const APPLE_NAV_TITLE_CLASS =
  "font-sans text-[17px] font-semibold leading-tight text-[var(--apple-text)]";

/** 本文（大） */
export const APPLE_BODY_LARGE_CLASS =
  "text-[21px] font-normal leading-[1.47] text-[var(--apple-text-secondary)]";

/** 本文（標準） */
export const APPLE_BODY_CLASS =
  "text-[17px] font-normal leading-[1.47] text-[var(--apple-text-secondary)]";

/** セカンダリラベル */
export const APPLE_CAPTION_CLASS =
  "text-[12px] leading-normal text-[var(--apple-text-secondary)]";

/** Tab Bar ラベル */
export const APPLE_TAB_LABEL_CLASS = "text-[11px] font-medium leading-none";

/** Primary pill ボタン */
export const APPLE_BUTTON_PRIMARY_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--apple-link)] px-8 py-3 text-[17px] font-medium text-white transition-opacity hover:opacity-88 active:opacity-76";

/** Secondary pill ボタン（アウトライン） */
export const APPLE_BUTTON_SECONDARY_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--apple-link)] bg-transparent px-8 py-3 text-[17px] font-medium text-[var(--apple-link)] transition-opacity hover:opacity-80 active:opacity-70";

/** テキストリンク（Learn more 風） */
export const APPLE_LINK_CLASS =
  "inline-flex items-center gap-1 text-[17px] font-normal text-[var(--apple-link)] transition-opacity hover:opacity-80";

/** inset grouped リスト */
export const APPLE_INSET_GROUP_CLASS =
  "overflow-hidden rounded-2xl bg-[var(--apple-card-bg)] shadow-sm";

/** リスト行 */
export const APPLE_INSET_ROW_CLASS =
  "flex min-h-[52px] items-center gap-3 px-4 py-3.5 text-[17px] text-[var(--apple-text)]";

/** カード面 */
export const APPLE_CARD_CLASS =
  "rounded-2xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-sm transition-shadow hover:shadow-md";

/** モーダル / シート */
export const APPLE_SHEET_CLASS =
  "overflow-hidden rounded-[28px] border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-xl";

/** LP セクション余白 */
export const APPLE_SECTION_PADDING_CLASS = "py-20 md:py-28 lg:py-36";

/** LP 見出し・CTA 等のコンテンツ最大幅 */
export const LP_CONTENT_MAX_WIDTH_PX = 1176;

/** LP Bento グリッド最大幅 */
export const LP_BENTO_MAX_WIDTH_PX = 1440;

/** LP コンテンツ幅 */
export const APPLE_CONTENT_WIDTH_CLASS =
  "mx-auto w-full max-w-[1176px] px-6 md:px-8";

/** LP フルブリード幅 */
export const APPLE_FULL_WIDTH_CLASS =
  "mx-auto w-full max-w-[1440px] px-6 md:px-8";

/** アプリシェルルート */
export const APP_SHELL_CLASS =
  "flex min-h-dvh flex-col bg-[var(--apple-bg)] text-[var(--apple-text)]";

/** アプリカード面 */
export const APP_SURFACE_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-sm";

/** エラー表示 */
export const APP_ERROR_BOX_CLASS =
  "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-600 dark:text-rose-300";

/** テーブル内コンパクト pill ボタン */
export const APP_TABLE_ACTION_BUTTON_CLASS =
  "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-88 active:opacity-76 disabled:pointer-events-none disabled:opacity-50";
