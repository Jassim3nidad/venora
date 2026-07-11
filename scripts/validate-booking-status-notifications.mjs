// Regression test for migration 062 (restore rich booking-status
// notifications). Requires 062 to be applied to the linked database —
// this is a live integration test against the hosted project (same
// pattern as scripts/validate-commission-resolution.mjs), not a unit
// test, because the behavior under test lives in a Postgres trigger
// function that Vitest cannot exercise directly.
//
// Uses the project's own labeled seed/test fixtures (profiles "Test Venue
// Owner" / "Customer", both 00000000-0000-0000-0000-00000000000{2,3}) and
// the "Amorita Resort" test venue + "Silver Package", the same fixtures
// already used elsewhere in this project's own dev/QA activity. Creates
// one disposable booking, exercises the trigger, asserts on the resulting
// notifications, then deletes everything it created.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env.local" });

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_CUSTOMER_ID = "00000000-0000-0000-0000-000000000003";
const TEST_VENUE_OWNER_ID = "00000000-0000-0000-0000-000000000002";
const TEST_VENUE_ID = "d131d99a-5300-4de4-a23f-03abf6c61c1d"; // Amorita Resort
const TEST_PACKAGE_ID = "c8c8da12-0d46-4fd3-bc5f-63c484628bcc"; // Silver Package, 64000

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

let testBookingId = null;

try {
  const farFutureDate = "2099-06-15";

  const { data: booking, error: insertErr } = await service
    .from("bookings")
    .insert({
      venue_id: TEST_VENUE_ID,
      customer_id: TEST_CUSTOMER_ID,
      package_id: TEST_PACKAGE_ID,
      event_date: farFutureDate,
      guest_count: 25,
      status: "pending",
    })
    .select()
    .single();
  if (insertErr) throw new Error(`setup: could not create test booking: ${insertErr.message}`);
  testBookingId = booking.id;
  console.log(`Created disposable test booking ${testBookingId} (will be deleted at the end).`);

  // Clear the 'pending' notifications the INSERT itself just triggered,
  // so the assertions below cleanly isolate the 'approved' transition.
  await service.from("notifications").delete().like("dedupe_key", `booking:${testBookingId}:%`);

  const { error: updateErr } = await service
    .from("bookings")
    .update({
      status: "approved",
      total_amount: 64000,
      deposit_amount: 32000,
      approved_at: new Date().toISOString(),
    })
    .eq("id", testBookingId);
  if (updateErr) throw new Error(`setup: could not approve test booking: ${updateErr.message}`);

  const customerDedupeKey = `booking:${testBookingId}:approved:customer`;
  const ownerDedupeKey = `booking:${testBookingId}:approved:owner:${TEST_VENUE_OWNER_ID}`;

  const { data: customerNotifs } = await service
    .from("notifications")
    .select("*")
    .eq("dedupe_key", customerDedupeKey);

  await check("customer notification was created for the approved transition", async () => {
    if (!customerNotifs || customerNotifs.length === 0) throw new Error("no notification found for the customer dedupe key");
  });

  const customerNotif = customerNotifs?.[0];

  await check("customer notification has non-empty metadata (booking_id, venue_id, status, event_date)", async () => {
    if (!customerNotif) throw new Error("no notification to check");
    const m = customerNotif.metadata;
    if (!m || Object.keys(m).length === 0) throw new Error("metadata is empty — regression not fixed");
    if (m.booking_id !== testBookingId) throw new Error(`metadata.booking_id mismatch: ${m.booking_id}`);
    if (m.venue_id !== TEST_VENUE_ID) throw new Error(`metadata.venue_id mismatch: ${m.venue_id}`);
    if (m.status !== "approved") throw new Error(`metadata.status mismatch: ${m.status}`);
    if (!m.event_date) throw new Error("metadata.event_date missing");
  });

  await check("customer notification has a deterministic dedupe_key", async () => {
    if (!customerNotif) throw new Error("no notification to check");
    if (customerNotif.dedupe_key !== customerDedupeKey) throw new Error(`dedupe_key mismatch: ${customerNotif.dedupe_key}`);
  });

  await check("customer notification has kind=booking_update", async () => {
    if (!customerNotif) throw new Error("no notification to check");
    if (customerNotif.kind !== "booking_update") throw new Error(`kind mismatch: ${customerNotif.kind}`);
  });

  await check("customer notification has priority=high for an approved transition", async () => {
    if (!customerNotif) throw new Error("no notification to check");
    if (customerNotif.priority !== "high") throw new Error(`priority mismatch: ${customerNotif.priority}`);
  });

  const { data: ownerNotifs } = await service.from("notifications").select("*").eq("dedupe_key", ownerDedupeKey);
  await check("owner notification was created for the test venue owner (org-member fan-out works)", async () => {
    if (!ownerNotifs || ownerNotifs.length === 0) throw new Error("no notification found for the owner dedupe key — is the test venue owner an organization_members row for Amorita Resort's org?");
  });

  await check("no duplicate notification is created for the same event + recipient (dedupe_key protection)", async () => {
    const { data: rpcResult, error: rpcErr } = await service.rpc("create_notification", {
      p_user_id: TEST_CUSTOMER_ID,
      p_kind: "booking_update",
      p_title: "Venue approved your request",
      p_body: "Your quote is ready. Pay the deposit to confirm your booking.",
      p_link: `/bookings/${testBookingId}/payment`,
      p_metadata: { booking_id: testBookingId, venue_id: TEST_VENUE_ID, status: "approved" },
      p_priority: "high",
      p_dedupe_key: customerDedupeKey,
    });
    if (rpcErr) throw rpcErr;
    if (rpcResult !== customerNotif.id) throw new Error(`create_notification returned a NEW id (${rpcResult}) instead of the existing one (${customerNotif.id}) — duplicate was created`);

    const { data: recount } = await service.from("notifications").select("id").eq("dedupe_key", customerDedupeKey);
    if ((recount ?? []).length !== 1) throw new Error(`expected exactly 1 notification for this dedupe_key, found ${(recount ?? []).length}`);
  });

  await check("notification_deliveries were enqueued for the customer notification (delivery pipeline still fires)", async () => {
    const { data: deliveries, error } = await service.from("notification_deliveries").select("channel, status").eq("notification_id", customerNotif.id);
    if (error) throw error;
    if (!deliveries || deliveries.length === 0) throw new Error("no notification_deliveries rows were enqueued");
  });
} finally {
  if (testBookingId) {
    // Match on dedupe_key (post-fix behavior) OR link (pre-fix behavior,
    // where dedupe_key is never set) so cleanup is safe to run against
    // either version of the trigger.
    await service.from("notifications").delete().like("dedupe_key", `booking:${testBookingId}:%`);
    await service.from("notifications").delete().like("link", `%${testBookingId}%`);
    await service.from("booking_status_history").delete().eq("booking_id", testBookingId);
    await service.from("bookings").delete().eq("id", testBookingId);
    console.log(`Cleaned up test booking ${testBookingId} and its notifications.`);
  }
}

console.log(failed ? "\nSome checks FAILED." : "\nAll booking-status notification regression checks PASSED.");
process.exit(failed ? 1 : 0);
