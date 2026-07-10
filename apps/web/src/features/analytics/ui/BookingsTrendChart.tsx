"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@venora/ui";
import { CHART_COLORS } from "@/components/dashboard/enterprise";
import type { RevenueTrendPoint } from "@/components/dashboard/enterprise";

const chartConfig: ChartConfig = {
  bookings: { label: "Bookings", color: CHART_COLORS.warning },
};

export function BookingsTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  const hasData = data.some((point) => Number(point.bookings) > 0);

  if (!hasData) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[#6b7280]">
        No booking trend data yet.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
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
        <Bar
          dataKey="bookings"
          fill={CHART_COLORS.warning}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
