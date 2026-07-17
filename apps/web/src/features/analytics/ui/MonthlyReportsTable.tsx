"use client";

import { useState } from "react";
import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import type { MonthlyReportRow } from "../application/queries";
import { Switch, Label } from "@venora/ui";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

const columns: DataTableColumn<MonthlyReportRow>[] = [
  {
    key: "period",
    header: "Month",
    cell: (row) => (
      <span className="font-semibold text-[#111827]">{row.period}</span>
    ),
  },
  {
    key: "revenue",
    header: "Booked Value",
    cell: (row) => formatCurrency(row.revenue),
  },
  {
    key: "bookings",
    header: "Bookings",
    cell: (row) => (
      <div>
        <span className="block font-semibold text-[#111827]">
          {row.bookings}
        </span>
        <span className="mt-1 block text-xs font-medium text-[#6b7280]">
          {row.confirmedBookings} accepted
        </span>
      </div>
    ),
  },
  {
    key: "customers",
    header: "Customers",
    cell: (row) => row.customers.toLocaleString("en-PH"),
  },
  {
    key: "conversion",
    header: "Conversion",
    cell: (row) => (
      <StatusBadge status="active" label={`${row.conversionRate}%`} />
    ),
  },
  {
    key: "average",
    header: "Avg. Value",
    cell: (row) => formatCurrency(row.averageBookingValue),
  },
  {
    key: "topVenue",
    header: "Top Venue",
    cell: (row) => row.topVenue,
  },
];

export function MonthlyReportsTable({ data }: { data: MonthlyReportRow[] }) {
  const [showZeroActivity, setShowZeroActivity] = useState(false);

  const filteredData = showZeroActivity
    ? data
    : data.filter((row) => row.bookings > 0 || row.revenue > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 px-2 pt-2">
        <Switch
          id="show-zero-months"
          checked={showZeroActivity}
          onCheckedChange={setShowZeroActivity}
        />
        <Label htmlFor="show-zero-months" className="text-sm font-medium text-slate-600">
          Show months with no activity
        </Label>
      </div>
      <DataTable
        rows={filteredData}
        columns={columns}
        keyFn={(row) => row.period}
        emptyMessage="No monthly analytics available for this range."
      />
    </div>
  );
}
