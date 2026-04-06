"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatYen } from "@/lib/format";

export interface ExpenseDetail {
  description: string;
  amount: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  color: string;
  details?: ExpenseDetail[];
}

const CHART_HEIGHT_PX = 300;
const DONUT_INNER_RADIUS = 70;
const DONUT_OUTER_RADIUS = 110;
const DONUT_PADDING_ANGLE = 3;
const PERCENT_SCALE = 100;
const MAX_DETAIL_LINES = 10;

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryData }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0].payload;
  const details = dataPoint.details ?? [];

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-sm font-semibold text-foreground">
        {dataPoint.category}
      </p>
      <p className="text-sm font-bold text-foreground">
        {formatYen(dataPoint.amount)}
      </p>
      {details.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
          {details.slice(0, MAX_DETAIL_LINES).map((detail, detailIndex) => (
            <li
              key={`${detail.description}-${detailIndex}`}
              className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground"
            >
              <span className="truncate">
                {detail.description || "（無題）"}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatYen(detail.amount)}
              </span>
            </li>
          ))}
          {details.length > MAX_DETAIL_LINES ? (
            <li className="text-[10px] text-muted-foreground">
              …他 {details.length - MAX_DETAIL_LINES} 件
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height: CHART_HEIGHT_PX }}
      >
        支出データがありません
      </div>
    );
  }

  return (
    <div style={{ height: CHART_HEIGHT_PX }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={DONUT_INNER_RADIUS}
            outerRadius={DONUT_OUTER_RADIUS}
            paddingAngle={DONUT_PADDING_ANGLE}
            dataKey="amount"
            nameKey="category"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * PERCENT_SCALE).toFixed(0)}%`
            }
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
