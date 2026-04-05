const CATEGORY_COLORS: Record<string, string> = {
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
