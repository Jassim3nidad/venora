import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  acceptSupplierQuoteAction,
  createSupplierContactRequestAction,
  declineSupplierQuoteAction,
} from "./actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("createSupplierContactRequestAction", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const supplierId = "00000000-0000-4000-8000-000000000002";
  const bookingId = "00000000-0000-4000-8000-000000000003";
  const venueId = "00000000-0000-4000-8000-000000000004";
  let mockSupabase: any;
  let mockUser: any;
  let singleMock: any;
  let maybeSingleMock: any;
  let insertMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = { id: userId };

    maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    singleMock = vi.fn();
    const query: any = {};
    const selectMock = vi.fn(() => query);
    const inMock = vi.fn(() => query);
    const eqMock = vi.fn(() => query);
    insertMock = vi.fn(() => query);
    Object.assign(query, {
      select: selectMock,
      insert: insertMock,
      eq: eqMock,
      in: inMock,
      single: singleMock,
      maybeSingle: maybeSingleMock,
    });

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn(() => query),
      rpc: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it("should fail if the supplier does not exist", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId,
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello supplier",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Supplier");
  });

  it("should fail if booking is invalid or does not belong to user", async () => {
    // Supplier exists
    singleMock.mockResolvedValueOnce({ data: { id: supplierId, accreditation_status: "accredited" }, error: null });
    // Booking doesn't exist or is not approved
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId,
      bookingId,
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello supplier",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("You can only link an approved venue booking");
  });

  it("should populate snapshot fields when valid booking is provided", async () => {
    // Supplier exists
    singleMock.mockResolvedValueOnce({ data: { id: supplierId, accreditation_status: "accredited" }, error: null });
    // Booking is valid
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: bookingId,
        status: "approved",
        event_date: "2026-12-01",
        event_start_time: "18:00:00",
        guest_count: 100,
        venue_id: venueId,
        venues: { name: "Grand Hall", city: "Makati", province: "Metro Manila" },
      },
      error: null,
    });
    // Insert succeeds
    singleMock.mockResolvedValueOnce({ data: { id: "00000000-0000-4000-8000-000000000005", status: "new" }, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId,
      bookingId,
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "Hello supplier",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("supplier_contact_requests");
    const insertCallArgs = insertMock.mock.calls[0][0];
    expect(insertCallArgs).toMatchObject({
      supplier_id: supplierId,
      customer_id: userId,
      booking_id: bookingId,
      venue_id: venueId,
      venue_name_snapshot: "Grand Hall",
      event_start_time_snapshot: "18:00:00",
      event_date_snapshot: "2026-12-01",
      guest_count_snapshot: 100,
      location_snapshot: "Grand Hall — Makati, Metro Manila"
    });
  });

  it("rejects an inquiry when the supplier blocked the event date", async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: supplierId, accreditation_status: "accredited" },
      error: null,
    });
    maybeSingleMock.mockResolvedValueOnce({
      data: { status: "blocked" },
      error: null,
    });

    const result = await createSupplierContactRequestAction({
      supplierId,
      contactName: "John Doe",
      contactEmail: "john@example.com",
      eventDate: "2026-12-01",
      message: "Please confirm your availability.",
    });

    expect(result.error?.message).toBe(
      "This supplier is unavailable on the selected date. Please choose another date.",
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("responds to customer proposal actions through the safe RPC", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        quote_id: "00000000-0000-4000-8000-000000000006",
        inquiry_id: "00000000-0000-4000-8000-000000000007",
        status: "accepted",
      },
      error: null,
    });

    const result = await acceptSupplierQuoteAction({
      quoteId: "00000000-0000-4000-8000-000000000006",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "respond_supplier_quote_customer",
      {
        p_quote_id: "00000000-0000-4000-8000-000000000006",
        p_status: "accepted",
      },
    );
    expect(mockSupabase.from).not.toHaveBeenCalledWith("supplier_quotes");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("supplier_contact_requests");
  });

  it("declines proposals through the safe RPC", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        quote_id: "00000000-0000-4000-8000-000000000006",
        inquiry_id: "00000000-0000-4000-8000-000000000007",
        status: "declined",
      },
      error: null,
    });

    const result = await declineSupplierQuoteAction({
      quoteId: "00000000-0000-4000-8000-000000000006",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "respond_supplier_quote_customer",
      {
        p_quote_id: "00000000-0000-4000-8000-000000000006",
        p_status: "declined",
      },
    );
  });
});
