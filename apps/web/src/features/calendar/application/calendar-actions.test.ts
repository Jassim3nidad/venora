import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveBookingDate, updateAvailability } from "./calendar-actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type QueryBuilder = Record<string, ReturnType<typeof vi.fn>>;

function maybeSingleBuilder(result: unknown) {
  const query: QueryBuilder = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  return query;
}

function limitBuilder(result: unknown) {
  const query: QueryBuilder = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.neq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue(result);
  return query;
}

function upsertBuilder(result: unknown) {
  return {
    upsert: vi.fn().mockResolvedValue(result),
  };
}

function updateBuilder(result: unknown) {
  const query: QueryBuilder = {};
  query.update = vi.fn(() => query);
  query.eq = vi.fn().mockResolvedValue(result);
  return query;
}

function mockSupabase(builders: Record<string, unknown[]>) {
  const queues = new Map(
    Object.entries(builders).map(([table, values]) => [table, [...values]]),
  );

  const supabase = {
    from: vi.fn((table: string) => {
      const queue = queues.get(table);
      const next = queue?.shift();
      if (!next) throw new Error(`Unexpected table query: ${table}`);
      return next;
    }),
  };

  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

describe("calendar actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates or updates editable venue availability", async () => {
    const upsert = upsertBuilder({ error: null });
    mockSupabase({
      venues: [
        maybeSingleBuilder({
          data: { id: "00000000-0000-4000-8000-000000000001", slug: "venue" },
          error: null,
        }),
      ],
      bookings: [limitBuilder({ data: [], error: null })],
      venue_availability: [upsert],
    });

    const result = await updateAvailability({
      venueId: "00000000-0000-4000-8000-000000000001",
      date: "2026-12-01",
      status: "maintenance",
      seasonalPriceOverride: null,
      note: "Annual maintenance",
    });

    expect(result).toEqual({ success: true });
    expect(upsert.upsert).toHaveBeenCalledWith(
      {
        venue_id: "00000000-0000-4000-8000-000000000001",
        date: "2026-12-01",
        status: "maintenance",
        seasonal_price_override: null,
        note: "Annual maintenance",
      },
      { onConflict: "venue_id, date" },
    );
  });

  it("denies availability edits when RLS hides another owner's venue", async () => {
    mockSupabase({
      venues: [maybeSingleBuilder({ data: null, error: null })],
    });

    const result = await updateAvailability({
      venueId: "00000000-0000-4000-8000-000000000002",
      date: "2026-12-01",
      status: "blackout",
    });

    expect(result).toEqual({
      success: false,
      error: "Venue not found or access denied",
    });
  });

  it("does not overwrite booking-generated availability entries", async () => {
    mockSupabase({
      venues: [
        maybeSingleBuilder({
          data: { id: "00000000-0000-4000-8000-000000000001", slug: "venue" },
          error: null,
        }),
      ],
      bookings: [
        limitBuilder({
          data: [{ id: "00000000-0000-4000-8000-000000000010" }],
          error: null,
        }),
      ],
    });

    const result = await updateAvailability({
      venueId: "00000000-0000-4000-8000-000000000001",
      date: "2026-12-01",
      status: "available",
    });

    expect(result).toEqual({
      success: false,
      error:
        "This date has active booking activity. Manage the booking before changing availability.",
    });
  });

  it("blocks moving a booking onto a blocked date", async () => {
    mockSupabase({
      bookings: [
        maybeSingleBuilder({
          data: {
            id: "00000000-0000-4000-8000-000000000010",
            venue_id: "00000000-0000-4000-8000-000000000001",
            status: "pending",
            venues: { slug: "venue" },
          },
          error: null,
        }),
      ],
      venue_availability: [
        maybeSingleBuilder({
          data: { status: "blackout" },
          error: null,
        }),
      ],
    });

    const result = await moveBookingDate({
      bookingId: "00000000-0000-4000-8000-000000000010",
      newDate: "2026-12-02",
    });

    expect(result).toEqual({
      success: false,
      error: "That date is not available. Choose another date first.",
    });
  });

  it("blocks moving a booking onto another active booking", async () => {
    mockSupabase({
      bookings: [
        maybeSingleBuilder({
          data: {
            id: "00000000-0000-4000-8000-000000000010",
            venue_id: "00000000-0000-4000-8000-000000000001",
            status: "confirmed",
            venues: { slug: "venue" },
          },
          error: null,
        }),
        limitBuilder({
          data: [{ id: "00000000-0000-4000-8000-000000000011" }],
          error: null,
        }),
      ],
      venue_availability: [
        maybeSingleBuilder({
          data: null,
          error: null,
        }),
      ],
    });

    const result = await moveBookingDate({
      bookingId: "00000000-0000-4000-8000-000000000010",
      newDate: "2026-12-02",
    });

    expect(result).toEqual({
      success: false,
      error: "That date already has an active booking.",
    });
  });

  it("moves an active booking to an available date", async () => {
    const update = updateBuilder({ error: null });
    mockSupabase({
      bookings: [
        maybeSingleBuilder({
          data: {
            id: "00000000-0000-4000-8000-000000000010",
            venue_id: "00000000-0000-4000-8000-000000000001",
            status: "approved",
            venues: { slug: "venue" },
          },
          error: null,
        }),
        limitBuilder({ data: [], error: null }),
        update,
      ],
      venue_availability: [
        maybeSingleBuilder({
          data: null,
          error: null,
        }),
      ],
    });

    const result = await moveBookingDate({
      bookingId: "00000000-0000-4000-8000-000000000010",
      newDate: "2026-12-02",
    });

    expect(result).toEqual({ success: true });
    expect(update.update).toHaveBeenCalledWith({ event_date: "2026-12-02" });
  });
});
