import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MaterialIcon } from "./MaterialIcon";

describe("MaterialIcon", () => {
  it("renders deterministic markup without font-readiness visibility state", () => {
    const markup = renderToStaticMarkup(
      <MaterialIcon name="calendar_month" className="text-xl" />,
    );

    expect(markup).toContain("material-symbols-outlined");
    expect(markup).toContain("calendar_month");
    expect(markup).not.toContain("visibility");
  });

  it("keeps filled icon styling deterministic for server and first client render", () => {
    const markup = renderToStaticMarkup(
      <MaterialIcon name="star" filled className="text-blue-600" />,
    );

    expect(markup).toContain("star");
    expect(markup).toContain("FILL");
    expect(markup).toContain("1");
    expect(markup).not.toContain("visibility");
  });
});
