import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "app/(customer)/account/messages/CustomerInboxClient.tsx",
  ),
  "utf8",
);

describe("unified customer inbox contract", () => {
  it("continues venue and supplier inquiry conversations on owned routes", () => {
    expect(source).toContain("/account/venue-inquiries/");
    expect(source).toContain("/inquiries/");
    expect(source).toContain("Continue this conversation");
  });

  it("keeps the inbox aware of all commercial thread kinds", () => {
    expect(source).toContain(
      '"booking" | "venue_inquiry" | "supplier_inquiry"',
    );
  });
});
