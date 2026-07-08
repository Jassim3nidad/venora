"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@venora/ui";
import { CATEGORICAL_PALETTE, CHART_COLORS } from "./palette";

export type StatusDistributionPoint = { status: string; count: number };

export function StatusDistributionChart({ data }: { data: StatusDistributionPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[#6b7280]">
        No data yet.
      </div>
    );
  }

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((point, index) => [
      point.status,
      {
        label: point.status.replace(/_/g, " "),
        color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] ?? CHART_COLORS.primary,
      },
    ]),
  );

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.status} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
