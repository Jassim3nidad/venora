"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@venora/ui";
import { CHART_COLORS } from "./palette";
import { formatChartValue, type ChartValueFormat } from "./format";

export type TopItem = { label: string; value: number; meta?: string };

const chartConfig: ChartConfig = {
  value: { label: "Count", color: CHART_COLORS.primary },
};

export function TopItemsBarChart({
  data,
  format = "number",
}: {
  data: TopItem[];
  format?: ChartValueFormat;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[#6b7280]">
        No data yet.
      </div>
    );
  }

  const valueFormatter = (value: number) => formatChartValue(value, format);

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={valueFormatter}
        />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent valueFormatter={valueFormatter} />} />
        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
