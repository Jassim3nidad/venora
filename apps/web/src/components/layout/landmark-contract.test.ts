import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../../..");
const readSource = (path: string) =>
  readFileSync(resolve(appRoot, path), "utf8");

const nestedMarketingSources = [
  "app/(marketing)/page.tsx",
  "app/(marketing)/about/page.tsx",
  "app/(marketing)/pricing/page.tsx",
  "src/components/layout/InfoPageShell.tsx",
];

const nestedMarketplaceSources = [
  "app/(customer)/bookings/[id]/page.tsx",
  "app/(customer)/owners/[slug]/page.tsx",
  "app/(customer)/owners/[slug]/loading.tsx",
  "app/(customer)/suppliers/loading.tsx",
  "app/(customer)/suppliers/[slug]/loading.tsx",
  "app/(customer)/venues/loading.tsx",
  "src/features/suppliers/ui/CustomerInquiryDetail.tsx",
  "src/features/suppliers/ui/SupplierDetail.tsx",
  "src/features/suppliers/ui/SuppliersMarketplaceClient.tsx",
  "src/features/venues/ui/VenueDetails.tsx",
  "src/features/venues/ui/VenuesClient.tsx",
];

describe("page landmark contract", () => {
  it("keeps one main landmark in each shared public shell", () => {
    expect(readSource("app/(marketing)/layout.tsx")).toContain("<main");
    expect(readSource("src/components/layout/MarketplaceLayout.tsx")).toContain(
      "<main",
    );
  });

  it.each([...nestedMarketingSources, ...nestedMarketplaceSources])(
    "does not nest a second main landmark in %s",
    (path) => {
      expect(readSource(path)).not.toContain("<main");
    },
  );

  it.each([
    "app/(marketing)/page.tsx",
    "app/(marketing)/about/page.tsx",
    "app/(marketing)/pricing/page.tsx",
  ])("keeps a visible page heading in %s", (path) => {
    expect(readSource(path)).toContain("<h1");
  });
});
