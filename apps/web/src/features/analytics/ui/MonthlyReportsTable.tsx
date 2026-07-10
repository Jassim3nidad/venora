import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import type { MonthlyReportRow } from "../application/queries";

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
    header: "Revenue",
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
          {row.confirmedBookings} confirmed
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

export function MonthlyReportsTable({ rows }: { rows: MonthlyReportRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      keyFn={(row) => row.period}
      emptyMessage="No monthly analytics available for this range yet."
    />
  );
}
