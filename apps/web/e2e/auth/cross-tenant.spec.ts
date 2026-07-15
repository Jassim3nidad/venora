import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";

// Cross-tenant isolation, tested through the application layer (page
// navigation + page.request, which carries the session cookie
// automatically -- see customer.spec.ts for why raw PostgREST calls with
// an extracted token were not used).
//
// Scope note: only customer-vs-customer isolation is testable with real
// data. Confirmed by direct read-only query before writing this file:
// every venue in the hosted database belongs to the same single
// organization (80000000-0000-0000-0000-000000000001) -- there is no
// second venue-owning organization to test venue-vs-venue isolation
// against. `supplier_profiles` is empty entirely -- there is no second
// supplier to test against either. Both are seed-data gaps, not
// authorization gaps, and are documented as untestable rather than
// worked around with fabricated data.

const OTHER_CUSTOMER_BOOKING_ID = "90369d1c-883b-4db2-9d50-8c14c332f56f"; // belongs to a real, different customer

test.describe("Cross-tenant isolation", () => {
  test("customer cannot view another customer's private booking by ID", async ({
    page,
  }) => {
    await loginAs(page, "customer");
    await page.goto(`/bookings/${OTHER_CUSTOMER_BOOKING_ID}`);
    // Must not render the other customer's booking details -- either a
    // not-found/unauthorized page, or a redirect away, but never the
    // actual booking content.
    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toMatch(/Lyceum of the Philippines/i);
  });

  test("customer cannot fetch another customer's booking via the app's own API", async ({
    page,
  }) => {
    await loginAs(page, "customer");
    const res = await page.request.get(
      `/api/bookings/${OTHER_CUSTOMER_BOOKING_ID}`,
      { failOnStatusCode: false },
    );
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe("Cross-tenant isolation — not testable with current seed data", () => {
  test.skip(
    true,
    "Every venue in the hosted database belongs to the same single organization (confirmed via direct query) -- no second venue-owning org exists to test venue-vs-venue isolation against.",
  );
  test("venue A cannot read venue B's private records", () => {});

  test.skip(
    true,
    "supplier_profiles is empty in the hosted database (confirmed via direct query) -- no second supplier exists to test supplier-vs-supplier isolation against.",
  );
  test("supplier A cannot read supplier B's private records", () => {});
});
