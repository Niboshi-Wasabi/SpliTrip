import { Receipt, FolderOpen, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatYen } from "@/lib/format";

type DashboardStatsGridProps = {
  totalExpense: number;
  groupCount: number;
  avgPerGroup: number;
  labels: {
    totalSpend: string;
    groupCount: string;
    avgPerGroup: string;
  };
};

export function DashboardStatsGrid({
  totalExpense,
  groupCount,
  avgPerGroup,
  labels,
}: DashboardStatsGridProps) {
  return (
    <div className="mb-6 grid items-stretch gap-4 sm:grid-cols-3">
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-[var(--apple-text-secondary)]">
              {labels.totalSpend}
            </CardTitle>
            <Receipt className="size-4 shrink-0 text-[var(--apple-text-secondary)]" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-end pt-0">
          <p className="text-2xl font-bold">{formatYen(totalExpense)}</p>
        </CardContent>
      </Card>

      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-[var(--apple-text-secondary)]">
              {labels.groupCount}
            </CardTitle>
            <FolderOpen className="size-4 shrink-0 text-[var(--apple-text-secondary)]" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-end pt-0">
          <p className="text-2xl font-bold">{groupCount}</p>
        </CardContent>
      </Card>

      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-[var(--apple-text-secondary)]">
              {labels.avgPerGroup}
            </CardTitle>
            <TrendingUp className="size-4 shrink-0 text-[var(--apple-text-secondary)]" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-end pt-0">
          <p className="text-2xl font-bold">{formatYen(avgPerGroup)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
