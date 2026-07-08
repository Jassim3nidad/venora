"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@venora/ui";
import { CHART_COLORS } from "./palette";

export type TopItem = { label: string; value: number; meta?: string };

const chartConfig: ChartConfig = {
  value: { label: "Count", color: CHART_COLORS.primary },
};

export function TopItemsBarChart({
  data,
  valueFormatter,
}: {
  data: TopItem[];
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[#6b7280]">
        No data yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value) => (valueFormatter ? valueFormatter(value) : String(value))}
        />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent valueFormatter={valueFormatter ?? ((value) => String(value))} />} />
        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
