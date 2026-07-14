import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable } from "./ui";

type Row = { id: string; name: string };

describe("DataTable", () => {
  it("renders its explicit empty state", () => {
    const markup = renderToStaticMarkup(
      DataTable<Row>({
        columns: [],
        rows: [],
        keyFn: (row) => row.id,
        emptyMessage: "No payments found.",
      }),
    );

    expect(markup).toContain("No payments found.");
    expect(markup).not.toContain("<table");
  });

  it("renders named scroll region and semantic table headers", () => {
    const markup = renderToStaticMarkup(
      DataTable<Row>({
        columns: [{ key: "name", header: "Venue", cell: (row) => row.name }],
        rows: [{ id: "venue-1", name: "Test Venue" }],
        keyFn: (row) => row.id,
      }),
    );

    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Table data, scroll horizontally');
    expect(markup).toContain("<table");
    expect(markup).toContain("<th");
    expect(markup).toContain("Test Venue");
  });
});
