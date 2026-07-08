// Chart value formatting. Deliberately a serializable string enum ("currency" | "number"),
// NOT a function prop — these wrapper components are Client Components invoked from Server
// Components throughout the dashboards, and Next.js forbids passing function props across
// that boundary. All formatting logic stays internal to the (client) chart components.
export type ChartValueFormat = "currency" | "number";

export function formatChartValue(value: number, format: ChartValueFormat = "number"): string {
  if (format === "currency") return `₱${value.toLocaleString()}`;
  return value.toLocaleString();
}
