import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupplierContactRequestAction } from "./actions";
import * as auth from "@/features/auth/application/get-server-user";
import { createClient } from "@supabase/supabase-js";

// Mocking dependencies
vi.mock("@/features/auth/application/get-server-user", () => ({
  getServerUserOrThrow: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("createSupplierContactRequestAction", () => {
  let mockSupabase: any;
  let mockUser: any;
  let singleMock: any;
  let maybeSingleMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = { id: "user-123" };
    (auth.getServerUserOrThrow as any).mockResolvedValue(mockUser);

    maybeSingleMock = vi.fn();
    singleMock = vi.fn();
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: singleMock });
    const inMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ in: inMock, select: selectMock, eq: vi.fn().mockReturnValue({ in: inMock, single: singleMock }) });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: selectMock,
        insert: insertMock,
        eq: eqMock,
      }),
    };

    const { createClient: createClientMock } = require("@/lib/supabase/server");
    createClientMock.mockResolvedValue(mockSupabase);
  });

  it("should fail if the supplier does not exist", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "sup-123",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Supplier");
  });

  it("should fail if booking is invalid or does not belong to user", async () => {
    // Supplier exists
    singleMock.mockResolvedValueOnce({ data: { id: "sup-123", accreditation_status: "accredited" }, error: null });
    // Booking doesn't exist or is not approved
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "sup-123",
      bookingId: "book-123",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("You can only link an approved venue booking");
  });

  it("should populate snapshot fields when valid booking is provided", async () => {
    // Supplier exists
    singleMock.mockResolvedValueOnce({ data: { id: "sup-123", accreditation_status: "accredited" }, error: null });
    // Booking is valid
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: "book-123",
        status: "approved",
        event_date: "2026-12-01",
        event_start_time: "18:00:00",
        guest_count: 100,
        venue_id: "venue-456",
        venues: { name: "Grand Hall", city: "Makati", province: "Metro Manila" },
      },
      error: null,
    });
    // Insert succeeds
    singleMock.mockResolvedValueOnce({ data: { id: "req-1", status: "pending" }, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "sup-123",
      bookingId: "book-123",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello",
    });

    expect(result.error).toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith("supplier_contact_requests");
    const insertCallArgs = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCallArgs).toMatchObject({
      supplier_id: "sup-123",
      customer_id: "user-123",
      booking_id: "book-123",
      venue_id: "venue-456",
      venue_name_snapshot: "Grand Hall",
      event_start_time_snapshot: "18:00:00",
      event_date_snapshot: "2026-12-01",
      guest_count_snapshot: 100,
      location_snapshot: "Grand Hall — Makati, Metro Manila"
    });
  });
});
