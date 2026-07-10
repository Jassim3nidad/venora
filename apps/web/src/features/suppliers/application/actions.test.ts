import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupplierContactRequestAction } from "./actions";
import { createClient as createServerClient } from "@/lib/supabase/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

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
    maybeSingleMock = vi.fn();
    singleMock = vi.fn();
    
    const selectMock = vi.fn().mockReturnValue({
      maybeSingle: maybeSingleMock,
      single: singleMock,
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: singleMock }),
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: singleMock }),
          single: singleMock
        })
      })
    });
    const inMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ in: inMock, select: selectMock, eq: vi.fn().mockReturnValue({ in: inMock, single: singleMock }) });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });

    mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: selectMock,
        insert: insertMock,
        eq: eqMock,
      }),
    };

    (createServerClient as any).mockResolvedValue(mockSupabase);
  });

  it("should fail if the supplier does not exist", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "123e4567-e89b-12d3-a456-426614174000",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "This is a long enough test message",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Supplier");
  });

  it("should fail if booking is invalid or does not belong to user", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "123e4567-e89b-12d3-a456-426614174000", accreditation_status: "accredited" }, error: null });
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "123e4567-e89b-12d3-a456-426614174000",
      bookingId: "123e4567-e89b-12d3-a456-426614174001",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "This is a long enough test message",
    });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("You can only link an approved venue booking");
  });

  it("should populate snapshot fields when valid booking is provided", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "123e4567-e89b-12d3-a456-426614174000", accreditation_status: "accredited" }, error: null });
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: "123e4567-e89b-12d3-a456-426614174001",
        status: "approved",
        event_date: "2026-12-01",
        event_start_time: "18:00:00",
        guest_count: 100,
        venue_id: "venue-456",
        venues: { name: "Grand Hall", city: "Makati", province: "Metro Manila" },
      },
      error: null,
    });
    singleMock.mockResolvedValueOnce({ data: { id: "req-1", status: "pending" }, error: null });

    const result = await createSupplierContactRequestAction({
      supplierId: "123e4567-e89b-12d3-a456-426614174000",
      bookingId: "123e4567-e89b-12d3-a456-426614174001",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      message: "This is a long enough test message",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("supplier_contact_requests");
    const insertCallArgs = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCallArgs).toMatchObject({
      supplier_id: "123e4567-e89b-12d3-a456-426614174000",
      customer_id: "user-123",
      booking_id: "123e4567-e89b-12d3-a456-426614174001",
      venue_id: "venue-456",
      venue_name_snapshot: "Grand Hall",
      event_start_time_snapshot: "18:00:00",
      event_date_snapshot: "2026-12-01",
      guest_count_snapshot: 100,
      location_snapshot: "Grand Hall — Makati, Metro Manila"
    });
  });
});
