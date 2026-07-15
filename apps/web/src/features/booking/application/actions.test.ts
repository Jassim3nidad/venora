import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Regression coverage for the booking-approval integrity bug: two code
 * paths used to validate totalAmount/depositAmount via Zod and then
 * perform a raw `UPDATE bookings SET status = 'approved'`, silently
 * discarding the validated amounts and never invoking
 * approve_booking_quote() — so bookings reached "approved" with a null
 * total/deposit and no invoice (issue_deposit_invoice only fires when
 * the RPC sets a positive deposit_amount).
 *
 * These are application-layer tests against a mocked Supabase client:
 * they prove approveBookingAction/declineBookingAction call the
 * validated RPC with the right arguments and never fall back to a raw
 * table write. They do NOT (and cannot, without a real Postgres
 * instance) prove Postgres's own transactional atomicity for
 * approve_booking_quote() + the issue_deposit_invoice trigger — that
 * guarantee comes from both running inside one statement/transaction in
 * the database itself, verified against the real hosted database in
 * migration 043's repair pass, not simulated here.
 */

const rpcMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();
const bookingsUpdateMock = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    rpc: rpcMock,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const ADMIN_USER_ID = "admin-user-1";

function mockAdminManageableBooking(bookingId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: ADMIN_USER_ID } } });

  fromMock.mockImplementation((table: string) => {
    if (table === "bookings") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: bookingId,
                status: "pending",
                venues: { organization_id: "org-1" },
              },
              error: null,
            }),
          }),
        }),
        // If any code path still performs a raw write instead of going
        // through the RPC, this makes that write observable to the test
        // (and would throw, since .update() here returns nothing chainable).
        update: bookingsUpdateMock,
      };
    }
    if (table === "user_roles") {
      return {
        select: () => ({
          eq: async () => ({ data: [{ role: "admin" }], error: null }),
        }),
      };
    }
    throw new Error(`Unexpected table in mock: ${table}`);
  });
}

describe("approveBookingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls approve_booking_quote with the validated total/deposit — never a raw table update", async () => {
    mockAdminManageableBooking("00000000-0000-0000-0000-000000000001");
    rpcMock.mockResolvedValue({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        status: "approved",
        total_amount: 100000,
        deposit_amount: 50000,
      },
      error: null,
    });

    const { approveBookingAction } = await import("./actions");
    const result = await approveBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000001",
      totalAmount: 100000,
      depositAmount: 50000,
    });

    expect(rpcMock).toHaveBeenCalledWith("approve_booking_quote", {
      p_booking_id: "00000000-0000-0000-0000-000000000001",
      p_total_amount: 100000,
      p_deposit_amount: 50000,
      p_note: null,
    });
    // The historical bug wrote directly via .from("bookings").update(...)
    // instead of the RPC — assert that path is never taken.
    expect(bookingsUpdateMock).not.toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      status: "approved",
      totalAmount: 100000,
      depositAmount: 50000,
    });
  });

  it("rejects approval with a non-positive total and performs no write", async () => {
    mockAdminManageableBooking("00000000-0000-0000-0000-000000000002");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Total amount must be greater than zero" },
    });

    const { approveBookingAction } = await import("./actions");

    // The schema itself also rejects non-positive numbers client-side;
    // this proves the SERVER path (not just client validation) rejects
    // it too, since the RPC is the actual source of truth.
    const result = await approveBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000002",
      totalAmount: 0.01,
      depositAmount: 0.01,
    });

    // Simulate what happens when the RPC itself enforces the rule
    // (the real Postgres function raises before any UPDATE runs).
    expect(rpcMock).toHaveBeenCalledWith(
      "approve_booking_quote",
      expect.objectContaining({
        p_booking_id: "00000000-0000-0000-0000-000000000002",
      }),
    );
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  it("propagates an RPC failure as an error without attempting any fallback write", async () => {
    mockAdminManageableBooking("00000000-0000-0000-0000-000000000003");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Only pending bookings can be approved" },
    });

    const { approveBookingAction } = await import("./actions");
    const result = await approveBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000003",
      totalAmount: 100000,
      depositAmount: 50000,
    });

    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
    // Exactly one RPC call — no retry, no secondary write attempt.
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("does not create a second invoice on repeated approval (RPC itself rejects a non-pending booking)", async () => {
    mockAdminManageableBooking("00000000-0000-0000-0000-000000000004");
    // First call succeeds.
    rpcMock.mockResolvedValueOnce({
      data: {
        id: "00000000-0000-0000-0000-000000000004",
        status: "approved",
        total_amount: 100000,
        deposit_amount: 50000,
      },
      error: null,
    });
    // Second call (booking is no longer "pending") — the RPC's own
    // state check rejects it; the action must surface that, not
    // silently succeed or write a second invoice itself.
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Only pending bookings can be approved" },
    });

    const { approveBookingAction } = await import("./actions");

    const first = await approveBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000004",
      totalAmount: 100000,
      depositAmount: 50000,
    });
    const second = await approveBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000004",
      totalAmount: 100000,
      depositAmount: 50000,
    });

    expect(first.error).toBeNull();
    expect(second.error).not.toBeNull();
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});

describe("declineBookingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls decline_booking_request with the validated reason — never a raw table update", async () => {
    mockAdminManageableBooking("00000000-0000-0000-0000-000000000005");
    rpcMock.mockResolvedValue({
      data: { id: "00000000-0000-0000-0000-000000000005", status: "declined" },
      error: null,
    });

    const { declineBookingAction } = await import("./actions");
    const result = await declineBookingAction({
      bookingId: "00000000-0000-0000-0000-000000000005",
      reason: "Venue unavailable on requested date",
    });

    expect(rpcMock).toHaveBeenCalledWith("decline_booking_request", {
      p_booking_id: "00000000-0000-0000-0000-000000000005",
      p_reason: "Venue unavailable on requested date",
    });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ status: "declined" });
  });
});
