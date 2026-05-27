"use client";

/**
 * Dashboard donut: totals by group vs by expense category (all groups the user belongs to).
 * ダッシュボード: グループ別 vs 全グループ横断のカテゴリ別支出。
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryChart, type CategoryData } from "@/app/[locale]/dashboard/category-chart";
import { cn } from "@/lib/utils";

type ChartMode = "group" | "category";

type Props = {
  chartByGroup: CategoryData[];
  chartByCategory: CategoryData[];
  totalFormatted: string;
  titleByGroup: string;
  titleByCategory: string;
};

export function DashboardSpendingChart({
  chartByGroup,
  chartByCategory,
  totalFormatted,
  titleByGroup,
  titleByCategory,
}: Props) {
  const chartTranslations = useTranslations("GroupCharts");
  const categoryTranslations = useTranslations("ExpenseCategory");

  const [mode, setMode] = useState<ChartMode>("group");

  const translatedCategoryChart: CategoryData[] = chartByCategory.map(
    (entry) => ({
      ...entry,
      category: categoryTranslations(parseExpenseCategoryId(entry.category)),
    }),
  );

  const activeData =
    mode === "group" ? chartByGroup : translatedCategoryChart;
  const activeTitle = mode === "group" ? titleByGroup : titleByCategory;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">{activeTitle}</CardTitle>
            <CardDescription>
              {chartTranslations("dashboardTotalDescription", {
                total: totalFormatted,
              })}
            </CardDescription>
          </div>
          <div
            className="flex w-full shrink-0 gap-1 rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)]/30 p-1 sm:w-auto"
            role="tablist"
            aria-label={chartTranslations("dashboardToggleAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "group"}
              className={cn(
                "min-h-[44px] flex-1 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-0 sm:flex-none sm:text-sm",
                mode === "group"
                  ? " text-[var(--apple-text)] shadow-sm"
                  : "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]",
              )}
              onClick={() => setMode("group")}
            >
              {chartTranslations("tabByGroup")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "category"}
              className={cn(
                "min-h-[44px] flex-1 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-0 sm:flex-none sm:text-sm",
                mode === "category"
                  ? " text-[var(--apple-text)] shadow-sm"
                  : "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]",
              )}
              onClick={() => setMode("category")}
            >
              {chartTranslations("tabCategory")}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CategoryChart data={activeData} />
      </CardContent>
    </Card>
  );
}
