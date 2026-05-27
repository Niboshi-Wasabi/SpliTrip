"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
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
  untitledLabel,
  moreCountLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryData }>;
  untitledLabel: string;
  moreCountLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0].payload;
  const details = dataPoint.details ?? [];

  return (
    <div className="rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] px-3 py-2 shadow-md">
      <p className="text-sm font-semibold text-[var(--apple-text)]">
        {dataPoint.category}
      </p>
      <p className="text-sm font-bold text-[var(--apple-text)]">
        {formatYen(dataPoint.amount)}
      </p>
      {details.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 border-t border-[var(--apple-separator)] pt-1.5">
          {details.slice(0, MAX_DETAIL_LINES).map((detail, detailIndex) => (
            <li
              key={`${detail.description}-${detailIndex}`}
              className="flex items-baseline justify-between gap-3 text-xs text-[var(--apple-text-secondary)]"
            >
              <span className="truncate">
                {detail.description || untitledLabel}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatYen(detail.amount)}
              </span>
            </li>
          ))}
          {details.length > MAX_DETAIL_LINES ? (
            <li className="text-[10px] text-[var(--apple-text-secondary)]">
              {moreCountLabel.replace(
                "{count}",
                String(details.length - MAX_DETAIL_LINES),
              )}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  const chartTranslations = useTranslations("CategoryChart");

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[var(--apple-text-secondary)]"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {chartTranslations("empty")}
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
            {data.map((entry, entryIndex) => (
              <Cell
                key={`${entry.category}-${entryIndex}`}
                fill={entry.color}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltipContent
                untitledLabel={chartTranslations("untitled")}
                moreCountLabel={chartTranslations("moreCount")}
              />
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
