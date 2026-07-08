"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@venora/lib";

// ─── Chart ───────────────────────────────────────────────────────────────────
// Thin wrapper around Recharts giving every series a themeable `--color-<key>`
// CSS variable (set via ChartConfig), consumed by chart-type wrapper components
// in apps/web via `fill="var(--color-revenue)"`-style references.

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--text-muted)]",
          "[&_.recharts-cartesian-grid_line]:stroke-[var(--border-default)]",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--border-default)]",
          "[&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${colorConfig
          .map(([key, cfg]) => `  --color-${key}: ${cfg.color};`)
          .join("\n")}\n}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
    labelFormatter?: (label: string) => React.ReactNode;
    valueFormatter?: (value: number) => React.ReactNode;
  }
>(({ active, payload, label, labelFormatter, valueFormatter }, ref) => {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      ref={ref}
      className="grid min-w-[10rem] gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-xs shadow-[var(--shadow-md)]"
    >
      {label ? (
        <div className="font-semibold text-[var(--text-primary)]">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key];
          const value = typeof item.value === "number" ? item.value : Number(item.value);

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color ?? "var(--color-brand-500)" }}
                />
                {itemConfig?.label ?? key}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {valueFormatter && !Number.isNaN(value) ? valueFormatter(value) : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  { payload?: readonly { value?: string; color?: string; dataKey?: string }[] }
>(({ payload }, ref) => {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.value ?? index);
        const itemConfig = config[key];

        return (
          <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color ?? "var(--color-brand-500)" }}
            />
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
