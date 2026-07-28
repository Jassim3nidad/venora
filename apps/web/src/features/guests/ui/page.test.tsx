import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GuestManagementPage from "../../../../app/(customer)/account/guests/page";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT:/login");
  }),
}));

vi.mock("@/features/guests/ui/GuestManager", () => ({
  GuestManager: () => <div>Guest manager ready</div>,
}));

function queryResult(result: unknown) {
  const query: any = {};
  Object.assign(query, {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn().mockResolvedValue(result),
  });
  return query;
}

describe("guest management page authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects anonymous users before reading guest records", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    } as any);

    await expect(GuestManagementPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(from).not.toHaveBeenCalled();
  });

  it("scopes guest reads to the authenticated customer", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const guests = queryResult({ data: [], error: null });
    const bookings = queryResult({ data: [], error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn((table: string) =>
        table === "event_guests" ? guests : bookings,
      ),
    } as any);

    const view = await GuestManagementPage();

    expect(renderToStaticMarkup(view)).toContain("Guest manager ready");
    expect(guests.eq).toHaveBeenCalledWith("user_id", userId);
    expect(bookings.eq).toHaveBeenCalledWith("customer_id", userId);
  });

  it("renders a generic setup state without leaking database errors", async () => {
    const internalError = 'relation "public.event_guests" does not exist';
    const guests = queryResult({
      data: null,
      error: { message: internalError },
    });
    const bookings = queryResult({ data: [], error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001" },
          },
        }),
      },
      from: vi.fn((table: string) =>
        table === "event_guests" ? guests : bookings,
      ),
    } as any);

    const html = renderToStaticMarkup(await GuestManagementPage());

    expect(html).toContain("Guest management is being prepared");
    expect(html).not.toContain(internalError);
  });
});
