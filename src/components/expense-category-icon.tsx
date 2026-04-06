"use client";

import type { ComponentType } from "react";
import { Bus, Ellipsis, Hotel, Landmark, Utensils } from "lucide-react";
import type { ExpenseCategoryId } from "@/lib/expense-categories";

const CATEGORY_LUCIDE_MAP: Record<
  ExpenseCategoryId,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  food: Utensils,
  transport: Bus,
  lodging: Hotel,
  sightseeing: Landmark,
  other: Ellipsis,
};

type Props = {
  categoryId: ExpenseCategoryId;
  className?: string;
};

/**
 * Lucide icon per expense category (food / transport / lodging / sightseeing / other).
 * 出費カテゴリごとの Lucide アイコン（食・交通・宿泊・観光・その他）。
 */
export function ExpenseCategoryIcon({ categoryId, className }: Props) {
  const IconComponent = CATEGORY_LUCIDE_MAP[categoryId];
  return (
    <IconComponent
      className={className ?? "h-4 w-4 shrink-0"}
      aria-hidden
    />
  );
}
