"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@venora/ui";
import { CHART_COLORS } from "./palette";

export type DemographicsBucket = { bucket: string; count: number };

const chartConfig: ChartConfig = {
  count: { label: "Bookings", color: CHART_COLORS.secondary },
};

export function DemographicsBarChart({ data }: { data: DemographicsBucket[] }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[#6b7280]">
        No data yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill={CHART_COLORS.secondary}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
