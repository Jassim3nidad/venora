// Regression test for migration 064 (fix duplicate cancellation history).
// Requires 064 to be applied to the linked database -- live integration
// test against the hosted project, same pattern as
// validate-commission-resolution.mjs and validate-booking-status-notifications.mjs.
//
// Uses the project's own labeled seed/test fixtures (profiles "Test Venue
// Owner" / "Customer", both 00000000-0000-0000-0000-00000000000{2,3}) and
// the "Amorita Resort" test venue + "Silver Package". Creates disposable
// bookings and cleans everything up in a finally block regardless of
// pass/fail.
//
// IMPORTANT SCOPE NOTE, found while writing this test:
// cancel_booking_request() reads auth.uid() for its permission check.
// Migration 064 also fixed a real bug where a NULL auth.uid() (e.g. a
// service-role call with no user JWT) could slip past that check due to
// three-valued NULL logic. Now that it's fixed, a service-role call can
// NEVER pass the permission check -- which means this script, run with
// only the service-role key, cannot drive a "successful" cancellation
// through the RPC at all (it also can't reach the RPC's own
// already-cancelled / invalid-state / audit-logging code, all of which
// sit *after* the permission check). Doing that would require a real
// per-user session, which this environment has no way to create safely
// (no known test-account password, and minting one is not something this
// script does). So this test is split into what's actually verifiable
// without one:
//
//   Part A (fully verified): the actual Phase-5 architecture fix --
//   cancelling a booking produces exactly one booking_status_history row
//   and exactly one correctly-shaped notification, with deliveries
//   enqueued, and a repeat of the identical transition does not
//   duplicate either. Driven by a direct, service-role status UPDATE
//   (the same trigger machinery cancel_booking_request() relies on),
//   deliberately not going through the RPC, since this part of the fix
//   lives in the trigger, not in the RPC's permission logic.
//
//   Part B (fully verified): the permission-check fix itself -- a caller
//   with no auth context is rejected, and the booking is left untouched.
//
//   Part C: explicitly reported as BLOCKED, not skipped silently -- the
//   RPC's own success path, its "already cancelled" conflict message,
//   its "invalid state" rejection, and its audit_logs write all require
//   a real authenticated session to reach and were not executed.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env.local" });

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_CUSTOMER_ID = "00000000-0000-0000-0000-000000000003";
const TEST_VENUE_ID = "d131d99a-5300-4de4-a23f-03abf6c61c1d"; // Amorita Resort
const TEST_PACKAGE_ID = "c8c8da12-0d46-4fd3-bc5f-63c484628bcc"; // Silver Package

let failed = false;
async function check(label, fn) {
  try {
    await fn();
    console.log(`PASS  ${label}`);
  } catch (e) {
    failed = true;
    console.log(`FAIL  ${label}:`, e.message ?? e);
  }
}
function blocked(label, reason) {
  console.log(`BLOCKED  ${label}: ${reason}`);
}

async function makeBooking(eventDate) {
  const { data, error } = await service
    .from("bookings")
    .insert({ venue_id: TEST_VENUE_ID, customer_id: TEST_CUSTOMER_ID, package_id: TEST_PACKAGE_ID, event_date: eventDate, guest_count: 25, status: "pending" })
    .select()
    .single();
  if (error) throw new Error(`setup: could not create test booking: ${error.message}`);
  return data;
}

async function cleanup(bookingId) {
  await service.from("notifications").delete().ilike("link", `%${bookingId}%`);
  await service.from("booking_status_history").delete().eq("booking_id", bookingId);
  await service.from("audit_logs").delete().eq("entity_id", bookingId);
  await service.from("bookings").delete().eq("id", bookingId);
}

let bookingA = null;
let bookingB = null;

try {
  console.log("=== Part A: trigger-level architecture (single history row, single notification) ===");
  bookingA = await makeBooking("2099-09-10");
  await service.from("notifications").delete().ilike("link", `%${bookingA.id}%`); // clear the pending-insert notification noise

  const { error: updateErr } = await service
    .from("bookings")
    .update({ status: "cancelled", decline_reason: "regression test cancellation", cancelled_at: new Date().toISOString() })
    .eq("id", bookingA.id);
  await check("direct cancellation transition succeeds", async () => {
    if (updateErr) throw new Error(updateErr.message);
  });

  const { data: historyRows } = await service.from("booking_status_history").select("status, changed_by").eq("booking_id", bookingA.id).eq("status", "cancelled");
  await check("exactly one history row was created for the cancellation (no duplicate from a manual insert)", async () => {
    if ((historyRows ?? []).length !== 1) throw new Error(`found ${(historyRows ?? []).length} rows: ${JSON.stringify(historyRows)}`);
  });

  const { data: customerNotifs } = await service.from("notifications").select("*").ilike("link", `%${bookingA.id}%`).eq("title", "Booking cancelled").eq("user_id", TEST_CUSTOMER_ID);
  await check("exactly one customer notification, with non-empty metadata", async () => {
    if ((customerNotifs ?? []).length !== 1) throw new Error(`found ${(customerNotifs ?? []).length} notifications`);
    const m = customerNotifs[0].metadata;
    if (!m || Object.keys(m).length === 0) throw new Error("metadata is empty");
    if (m.booking_id !== bookingA.id) throw new Error(`metadata.booking_id mismatch: ${m.booking_id}`);
  });

  await check("notification has a deterministic dedupe_key", async () => {
    const expected = `booking:${bookingA.id}:cancelled:customer`;
    if (customerNotifs[0].dedupe_key !== expected) throw new Error(`dedupe_key: ${customerNotifs[0].dedupe_key}`);
  });

  await check("notification_deliveries were enqueued", async () => {
    const { data: deliveries } = await service.from("notification_deliveries").select("id").eq("notification_id", customerNotifs[0].id);
    if (!deliveries || deliveries.length === 0) throw new Error("no deliveries enqueued");
  });

  // A repeat of the identical transition (same status -> same status) is
  // exactly what the trigger's own OLD.status IS NOT DISTINCT FROM
  // NEW.status guard exists for -- confirms no duplicate on replay.
  const { error: repeatErr } = await service.from("bookings").update({ decline_reason: "regression test cancellation (repeat)" }).eq("id", bookingA.id).eq("status", "cancelled");
  await check("a no-op repeat update does not duplicate history or notifications", async () => {
    if (repeatErr) throw new Error(repeatErr.message);
    const { data: h2 } = await service.from("booking_status_history").select("id").eq("booking_id", bookingA.id).eq("status", "cancelled");
    if ((h2 ?? []).length !== 1) throw new Error(`history rows after repeat: ${(h2 ?? []).length}`);
    const { data: n2 } = await service.from("notifications").select("id").ilike("link", `%${bookingA.id}%`).eq("title", "Booking cancelled").eq("user_id", TEST_CUSTOMER_ID);
    if ((n2 ?? []).length !== 1) throw new Error(`notifications after repeat: ${(n2 ?? []).length}`);
  });

  console.log("\n=== Part B: cancel_booking_request()'s permission check (reachable without a real session) ===");
  bookingB = await makeBooking("2099-09-11");
  const { error: unauthErr } = await service.rpc("cancel_booking_request", { p_booking_id: bookingB.id, p_reason: "should be rejected" });
  await check("a caller with no auth context cannot cancel someone else's booking", async () => {
    if (!unauthErr) throw new Error("cancellation succeeded without any authorization context");
    if (!/permission/i.test(unauthErr.message)) throw new Error(`unexpected error message: ${unauthErr.message}`);
  });
  const { data: bookingBAfter } = await service.from("bookings").select("status").eq("id", bookingB.id).single();
  await check("the unauthorized booking's status is unchanged", async () => {
    if (bookingBAfter?.status !== "pending") throw new Error(`status changed to ${bookingBAfter?.status}`);
  });

  console.log("\n=== Part C: requires a real authenticated session -- not executed ===");
  blocked("cancel_booking_request()'s own success path (as the booking's real customer)", "no known test-account password in this environment; not minted");
  blocked("repeated cancellation via the RPC returns 'This booking is already cancelled'", "unreachable without first passing the permission check as a real user");
  blocked("an invalid-state booking is rejected by the RPC with 'can no longer be cancelled'", "unreachable without first passing the permission check as a real user");
  blocked("audit_logs entry from cancel_booking_request() (action=booking.cancelled)", "only written on a successful RPC call, unreachable as above");
} finally {
  for (const b of [bookingA, bookingB]) {
    if (b) await cleanup(b.id);
  }
  console.log("\nCleaned up all disposable test bookings.");
}

console.log(failed ? "\nSome checks FAILED." : "\nAll executable cancellation-history checks PASSED (see BLOCKED items above for what could not be verified).");
process.exit(failed ? 1 : 0);
