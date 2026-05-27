"use client";

/**
 * Toggle pie chart between payer totals and category totals (group scope).
 * 支払者別 / カテゴリ別の円グラフ切替（グループ内）。
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

type ChartMode = "payer" | "category";

type Props = {
  payerChartData: CategoryData[];
  categoryChartData: CategoryData[];
  totalLabel: string;
  titlePayer: string;
  titleCategory: string;
};

export function GroupSpendingChartCard({
  payerChartData,
  categoryChartData,
  totalLabel,
  titlePayer,
  titleCategory,
}: Props) {
  const chartTranslations = useTranslations("GroupCharts");
  const categoryTranslations = useTranslations("ExpenseCategory");

  const [mode, setMode] = useState<ChartMode>("payer");

  const translatedCategoryData: CategoryData[] = categoryChartData.map(
    (entry) => ({
      ...entry,
      category: categoryTranslations(parseExpenseCategoryId(entry.category)),
    }),
  );

  const activeData =
    mode === "payer" ? payerChartData : translatedCategoryData;
  const activeTitle = mode === "payer" ? titlePayer : titleCategory;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">{activeTitle}</CardTitle>
            <CardDescription>
              {chartTranslations("groupTotalDescription", { total: totalLabel })}
            </CardDescription>
          </div>
          <div
            className="flex w-full shrink-0 gap-1 rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)]/30 p-1 sm:w-auto"
            role="tablist"
            aria-label={chartTranslations("toggleAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "payer"}
              className={cn(
                "min-h-[44px] flex-1 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-0 sm:flex-none sm:text-sm",
                mode === "payer"
                  ? " text-[var(--apple-text)] shadow-sm"
                  : "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]",
              )}
              onClick={() => setMode("payer")}
            >
              {chartTranslations("tabPayer")}
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
