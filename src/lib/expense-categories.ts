/**
 * Canonical expense category IDs stored in `group_expenses.category`.
 * DB 値と一致させる。アイコンは UI 側で Lucide にマッピングする。
 *
 * Why a single source of truth: avoids drift between SQL CHECK, API validation, and forms.
 * 理由: SQL の CHECK・API・フォームでズレないように一箇所に集約する。
 */

export const EXPENSE_CATEGORY_IDS = [
  "food",
  "transport",
  "lodging",
  "sightseeing",
  "other",
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORY_IDS)[number];

export function isExpenseCategoryId(value: string): value is ExpenseCategoryId {
  return (EXPENSE_CATEGORY_IDS as readonly string[]).includes(value);
}

/**
 * Parse user/API input with early return for invalid tokens.
 * 不正なトークンは `other` に落とす（早期リターンで分岐を浅く保つ）。
 */
export function parseExpenseCategoryId(raw: unknown): ExpenseCategoryId {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "other";
  }
  const normalized = raw.trim().toLowerCase();
  if (isExpenseCategoryId(normalized)) {
    return normalized;
  }
  return "other";
}
