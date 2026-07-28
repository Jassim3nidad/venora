import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGuestAction,
  importGuestsAction,
  saveGuestAction,
} from "./actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const userId = "00000000-0000-4000-8000-000000000001";
const guestId = "00000000-0000-4000-8000-000000000002";
const foreignBookingId = "00000000-0000-4000-8000-000000000003";

function createQuery(result: unknown) {
  const query: any = {};
  Object.assign(query, {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  });
  return query;
}

describe("guest actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes authenticated ownership on create", async () => {
    const query = createQuery({
      data: { id: guestId, user_id: userId },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await saveGuestAction({
      firstName: "Ana",
      lastName: "Santos",
      guestGroup: "Family",
      plusOnesAllowed: 1,
      rsvpStatus: "pending",
    });

    expect(result.error).toBeNull();
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        first_name: "Ana",
        last_name: "Santos",
      }),
    );
  });

  it("scopes updates by guest ID and authenticated owner", async () => {
    const query = createQuery({
      data: { id: guestId, user_id: userId },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await saveGuestAction({
      id: guestId,
      firstName: "Ana",
      lastName: "Santos",
      guestGroup: "Family",
      plusOnesAllowed: 0,
      rsvpStatus: "attending",
    });

    expect(result.error).toBeNull();
    expect(query.eq).toHaveBeenCalledWith("id", guestId);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("scopes deletes by guest ID and authenticated owner", async () => {
    const query = createQuery({ data: { id: guestId }, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await deleteGuestAction({ id: guestId });

    expect(result.error).toBeNull();
    expect(query.eq).toHaveBeenCalledWith("id", guestId);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects unauthenticated writes", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    } as any);

    const result = await saveGuestAction({
      firstName: "Ana",
      lastName: "Santos",
    });

    expect(result.error?.code).toBe("UNAUTHORIZED");
    expect(from).not.toHaveBeenCalled();
  });

  it("reports denied foreign booking ownership without database details", async () => {
    const query = createQuery({
      data: null,
      error: {
        message:
          'new row violates row-level security policy for table "event_guests"',
      },
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await saveGuestAction({
      bookingId: foreignBookingId,
      firstName: "Ana",
      lastName: "Santos",
    });

    expect(result.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Guest or booking access was denied.",
    });
    expect(result.error?.message).not.toContain("row-level security");
  });

  it("forces CSV imports to the authenticated user", async () => {
    const query = createQuery({
      data: [{ id: guestId, user_id: userId }],
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await importGuestsAction({
      guests: [
        {
          userId: "00000000-0000-4000-8000-000000000099",
          firstName: "Ana",
          lastName: "Santos",
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(query.insert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: userId }),
    ]);
  });

  it("rejects access when another customer's guest is not visible", async () => {
    const query = createQuery({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await deleteGuestAction({ id: guestId });

    expect(result.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Guest not found or access denied.",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });
});
