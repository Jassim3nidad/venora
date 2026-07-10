import type {
  DateRange,
  MonthlyReportRow,
  PopularVenueResult,
} from "./queries";

export type AnalyticsExportData = {
  generatedAt: string;
  range: DateRange;
  summary: {
    totalRevenue: number;
    totalBookings: number;
    confirmedBookings: number;
    customers: number;
    conversionRate: number;
  };
  monthlyReports: MonthlyReportRow[];
  popularVenues: PopularVenueResult[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function csvCell(value: string | number) {
  const raw = String(value);
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

export function buildAnalyticsCsv(data: AnalyticsExportData) {
  const lines = [
    csvRow(["Venora Venue Analytics"]),
    csvRow(["Generated At", data.generatedAt]),
    csvRow(["From", data.range.from]),
    csvRow(["To", data.range.to]),
    "",
    csvRow(["Summary"]),
    csvRow(["Total Revenue", data.summary.totalRevenue]),
    csvRow(["Total Bookings", data.summary.totalBookings]),
    csvRow(["Confirmed Bookings", data.summary.confirmedBookings]),
    csvRow(["Customers", data.summary.customers]),
    csvRow(["Conversion Rate", `${data.summary.conversionRate}%`]),
    "",
    csvRow([
      "Month",
      "Revenue",
      "Bookings",
      "Confirmed Bookings",
      "Customers",
      "Conversion Rate",
      "Average Booking Value",
      "Top Venue",
    ]),
    ...data.monthlyReports.map((row) =>
      csvRow([
        row.period,
        row.revenue,
        row.bookings,
        row.confirmedBookings,
        row.customers,
        `${row.conversionRate}%`,
        row.averageBookingValue,
        row.topVenue,
      ]),
    ),
    "",
    csvRow(["Popular Venues"]),
    csvRow(["Venue", "Location", "Bookings", "Revenue", "Rating", "Reviews"]),
    ...data.popularVenues.map((venue) =>
      csvRow([
        venue.label,
        venue.city,
        venue.bookings,
        venue.revenue,
        venue.rating,
        venue.reviews,
      ]),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function ascii(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "?");
}

function pdfText(value: string | number) {
  return ascii(String(value))
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function drawText(x: number, y: number, size: number, text: string | number) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`;
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function buildAnalyticsPdf(data: AnalyticsExportData) {
  const recentRows = data.monthlyReports.slice(-8).reverse();
  const topVenues = data.popularVenues.slice(0, 5);
  const contentLines = [
    drawText(48, 790, 18, "Venora Venue Analytics"),
    drawText(48, 766, 10, `Generated ${data.generatedAt}`),
    drawText(48, 750, 10, `Range ${data.range.from} to ${data.range.to}`),
    drawText(
      48,
      716,
      12,
      `Revenue: ${formatCurrency(data.summary.totalRevenue)}`,
    ),
    drawText(48, 698, 12, `Bookings: ${data.summary.totalBookings}`),
    drawText(48, 680, 12, `Confirmed: ${data.summary.confirmedBookings}`),
    drawText(280, 716, 12, `Customers: ${data.summary.customers}`),
    drawText(280, 698, 12, `Conversion: ${data.summary.conversionRate}%`),
    drawText(48, 650, 13, "Monthly Report"),
    drawText(48, 628, 9, "Month"),
    drawText(146, 628, 9, "Revenue"),
    drawText(248, 628, 9, "Bookings"),
    drawText(322, 628, 9, "Customers"),
    drawText(404, 628, 9, "Conversion"),
    drawText(486, 628, 9, "Top Venue"),
    ...recentRows.flatMap((row, index) => {
      const y = 608 - index * 20;
      return [
        drawText(48, y, 8, row.period),
        drawText(146, y, 8, formatCurrency(row.revenue)),
        drawText(248, y, 8, row.bookings),
        drawText(322, y, 8, row.customers),
        drawText(404, y, 8, `${row.conversionRate}%`),
        drawText(486, y, 8, row.topVenue.slice(0, 20)),
      ];
    }),
    drawText(48, 426, 13, "Popular Venues"),
    ...topVenues.flatMap((venue, index) => {
      const y = 402 - index * 22;
      return [
        drawText(48, y, 9, `${index + 1}. ${venue.label.slice(0, 36)}`),
        drawText(330, y, 9, `${venue.bookings} bookings`),
        drawText(430, y, 9, formatCurrency(venue.revenue)),
      ];
    }),
  ];
  const content = `${contentLines.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function analyticsExportFilename(
  format: "csv" | "pdf",
  date = new Date(),
) {
  return `venora-venue-analytics-${date.toISOString().slice(0, 10)}.${format}`;
}
