"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@venora/ui";
import { CHART_COLORS } from "./palette";

export type RevenueTrendPoint = { period: string; revenue: number; bookings?: number };

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: CHART_COLORS.primary },
};

export function RevenueTrendChart({
  data,
  valueFormatter,
}: {
  data: RevenueTrendPoint[];
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[#6b7280]">
        Not enough data yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          width={48}
          tickFormatter={(value) => (valueFormatter ? valueFormatter(value) : String(value))}
        />
        <ChartTooltip content={<ChartTooltipContent valueFormatter={valueFormatter ?? ((value) => String(value))} />} />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke={CHART_COLORS.primary}
          fill="url(#revenueTrendFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
