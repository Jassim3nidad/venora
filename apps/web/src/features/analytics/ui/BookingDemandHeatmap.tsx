import { Fragment } from "react";
import type { BookingHeatmapPoint } from "../application/queries";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellStyle(intensity: number, count: number) {
  if (count === 0) {
    return {
      backgroundColor: "#f8fafc",
      color: "#94a3b8",
      borderColor: "#e2e8f0",
    };
  }

  const opacity = Math.min(0.92, 0.2 + intensity * 0.72);
  return {
    backgroundColor: `rgba(29, 78, 216, ${opacity})`,
    color: intensity > 0.55 ? "#ffffff" : "#0f172a",
    borderColor: "rgba(29, 78, 216, 0.2)",
  };
}

export function BookingDemandHeatmap({
  data,
}: {
  data: BookingHeatmapPoint[];
}) {
  const months = [...new Set(data.map((point) => point.month))];
  const total = data.reduce((sum, point) => sum + point.count, 0);

  if (months.length === 0 || total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[#6b7280]">
        No booking demand data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[760px] gap-2"
        style={{
          gridTemplateColumns: `64px repeat(${months.length}, minmax(46px, 1fr))`,
        }}
      >
        <div />
        {months.map((month) => (
          <div
            key={month}
            className="truncate text-center text-[11px] font-black text-[#64748b]"
          >
            {month.replace(" ", "\u00a0")}
          </div>
        ))}

        {DAY_ORDER.map((day) => (
          <Fragment key={day}>
            <div
              key={`${day}-label`}
              className="flex h-10 items-center text-xs font-bold text-[#64748b]"
            >
              {day}
            </div>
            {months.map((month) => {
              const point = data.find(
                (item) => item.month === month && item.day === day,
              );
              const count = point?.count ?? 0;
              return (
                <div
                  key={`${month}-${day}`}
                  className="flex h-10 items-center justify-center rounded-lg border text-xs font-black"
                  style={cellStyle(point?.intensity ?? 0, count)}
                  title={`${month} ${day}: ${count} bookings`}
                >
                  {count}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-xs font-semibold text-[#64748b]">
        <span>Lower</span>
        {[0.2, 0.45, 0.7, 0.95].map((intensity) => (
          <span
            key={intensity}
            className="h-3 w-7 rounded-full border border-[#bfdbfe]"
            style={{ backgroundColor: `rgba(29, 78, 216, ${intensity})` }}
          />
        ))}
        <span>Higher</span>
      </div>
    </div>
  );
}
