import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "../helpers/auth";

// Closes the gap flagged in migration 064's regression coverage
// (scripts/validate-cancellation-history.mjs Part C): the RPC's own
// success path, repeat-cancellation conflict, and audit logging all
// require a real authenticated session to reach. Now that dedicated QA
// credentials are available, this drives the actual cancel-booking UI
// as the real customer fixture instead of calling the RPC via
// service-role (which can no longer pass the permission check at all,
// by design, after migration 064's auth fix).

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_CUSTOMER_ID = "00000000-0000-0000-0000-000000000003";
const TEST_VENUE_ID = "d131d99a-5300-4de4-a23f-03abf6c61c1d"; // Amorita Resort
const TEST_PACKAGE_ID = "c8c8da12-0d46-4fd3-bc5f-63c484628bcc"; // Silver Package

test.describe.serial("Cancellation flow (real customer session)", () => {
  let bookingId: string;

  test.beforeEach(async () => {
    // Clean up any stray availability from a crashed prior run
    await service
      .from("venue_availability")
      .delete()
      .eq("venue_id", TEST_VENUE_ID)
      .eq("date", "2099-10-01");
    // Also clean up any stray booking
    await service
      .from("bookings")
      .delete()
      .eq("venue_id", TEST_VENUE_ID)
      .eq("event_date", "2099-10-01");

    const { data, error } = await service
      .from("bookings")
      .insert({
        venue_id: TEST_VENUE_ID,
        customer_id: TEST_CUSTOMER_ID,
        package_id: TEST_PACKAGE_ID,
        event_date: "2099-10-01",
        guest_count: 25,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    bookingId = data.id;
  });

  test.afterEach(async () => {
    await service
      .from("notifications")
      .delete()
      .ilike("link", `%${bookingId}%`);
    await service
      .from("booking_status_history")
      .delete()
      .eq("booking_id", bookingId);
    await service.from("audit_logs").delete().eq("entity_id", bookingId);
    await service.from("bookings").delete().eq("id", bookingId);
    
    // Deleting a booking doesn't revert venue_availability (trigger only fires on UPDATE/INSERT)
    await service
      .from("venue_availability")
      .delete()
      .eq("venue_id", TEST_VENUE_ID)
      .eq("date", "2099-10-01");
  });

  test("the real customer can cancel their own booking, and it is audited exactly once", async ({
    page,
  }) => {
    await loginAs(page, "customer");
    await page.goto(`/bookings/${bookingId}/cancel`);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === "/bookings", {
      timeout: 15000,
    });

    const { data: booking } = await service
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single();
    expect(booking?.status).toBe("cancelled");

    const { data: auditRows } = await service
      .from("audit_logs")
      .select("id")
      .eq("entity_id", bookingId)
      .eq("action", "booking.cancelled");
    expect(auditRows?.length).toBe(1);

    const { data: historyRows } = await service
      .from("booking_status_history")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("status", "cancelled");
    expect(historyRows?.length).toBe(1);
  });

  test("the cancel page itself blocks re-entry for an already-cancelled booking (page-level guard, before the RPC)", async ({
    page,
  }) => {
    await loginAs(page, "customer");
    await page.goto(`/bookings/${bookingId}/cancel`);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === "/bookings", {
      timeout: 15000,
    });

    // Second attempt: the cancel page's own canCancelBookingStatus() guard
    // (apps/web/app/(customer)/bookings/[id]/cancel/page.tsx) redirects
    // away before the form -- and therefore the RPC -- is ever reached.
    await page.goto(`/bookings/${bookingId}/cancel`);
    await page.waitForURL((url) => url.pathname === `/bookings/${bookingId}`, {
      timeout: 15000,
    });

    const { data: auditRows } = await service
      .from("audit_logs")
      .select("id")
      .eq("entity_id", bookingId)
      .eq("action", "booking.cancelled");
    expect(auditRows?.length).toBe(1);
    const { data: historyRows } = await service
      .from("booking_status_history")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("status", "cancelled");
    expect(historyRows?.length).toBe(1);
  });
});

// Not covered here: cancel_booking_request()'s own "already cancelled"
// error message specifically (as opposed to the page-level redirect
// above) -- the real UI's page guard means that code path is never
// reached through normal navigation, and cancellation is a Server
// Action (no REST route to call directly without replicating Next.js's
// private Server Action wire protocol, which isn't worth the fragility).
// The RPC-level guard itself was already verified directly in
// scripts/validate-cancellation-history.mjs Part B (unauthenticated
// rejection) and by reading migration 064's source.
