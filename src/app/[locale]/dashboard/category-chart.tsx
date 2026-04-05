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

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

const CHART_HEIGHT_PX = 300;
const DONUT_INNER_RADIUS = 70;
const DONUT_OUTER_RADIUS = 110;
const DONUT_PADDING_ANGLE = 3;
const PERCENT_SCALE = 100;

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
          <Tooltip formatter={(value) => formatYen(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
