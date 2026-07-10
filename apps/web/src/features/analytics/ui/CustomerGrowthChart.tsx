"use client";

import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@venora/ui";
import { CHART_COLORS } from "@/components/dashboard/enterprise";
import type { CustomerGrowthPoint } from "../application/queries";

const chartConfig: ChartConfig = {
  totalCustomers: { label: "Total customers", color: CHART_COLORS.success },
  newCustomers: { label: "New customers", color: CHART_COLORS.secondary },
};

export function CustomerGrowthChart({ data }: { data: CustomerGrowthPoint[] }) {
  const hasData = data.some(
    (point) => point.totalCustomers > 0 || point.newCustomers > 0,
  );

  if (!hasData) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[#6b7280]">
        No customer growth data yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="customerGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={CHART_COLORS.success}
              stopOpacity={0.28}
            />
            <stop
              offset="95%"
              stopColor={CHART_COLORS.success}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          width={36}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="totalCustomers"
          type="monotone"
          stroke={CHART_COLORS.success}
          fill="url(#customerGrowthFill)"
          strokeWidth={2}
        />
        <Line
          dataKey="newCustomers"
          type="monotone"
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
