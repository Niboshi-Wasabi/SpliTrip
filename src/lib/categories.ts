import type { ExpenseCategoryId } from "@/lib/expense-categories";

/** Stable colors for `ExpenseCategoryId` keys (charts / badges). */
const EXPENSE_CATEGORY_KEY_COLORS: Record<ExpenseCategoryId, string> = {
  food: "#f59e0b",
  transport: "#3b82f6",
  lodging: "#10b981",
  sightseeing: "#8b5cf6",
  other: "#6b7280",
};

const CATEGORY_COLORS: Record<string, string> = {
  ...EXPENSE_CATEGORY_KEY_COLORS,
  交通費: "#3b82f6",
  宿泊費: "#10b981",
  食費: "#f59e0b",
  "観光・レジャー": "#8b5cf6",
  お土産: "#ec4899",
  その他: "#6b7280",
};

const FALLBACK_COLORS = [
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#ef4444",
  "#84cc16",
];

export function getCategoryColor(category: string, index: number): string {
  return (
    CATEGORY_COLORS[category] ??
    FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  );
}

/**
 * Color for a canonical expense category id (deterministic, no index drift).
 */
export function getExpenseCategoryChartColor(categoryId: ExpenseCategoryId): string {
  return EXPENSE_CATEGORY_KEY_COLORS[categoryId];
}
