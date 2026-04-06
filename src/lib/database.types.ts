/**
 * Hand-maintained DB-facing types (Supabase). Keep in sync with migrations.
 * マイグレーションと揃えるための型（自動生成に置き換え可能）。
 */

/** Persisted on `group_expenses.split_type` / matches `public.expense_split_mode`. */
export type ExpenseSplitModeDb =
  | "EQUAL"
  | "EXACT"
  | "PERCENTAGE"
  | "SHARES"
  | "ITEMIZED";

/** `user_profiles.payment_links` JSON array element. */
export type PaymentLinkStored = {
  url: string;
  label?: string;
};

/** Subset of `user_profiles` used for freemium / PRO gating. */
export type UserProfileFreemiumFields = {
  premium_access: boolean;
  ocr_usage_count: number;
};
