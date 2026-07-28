import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { saveSeatingTableAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const userId = "00000000-0000-4000-8000-000000000001";

function createQuery(result: unknown) {
  const query: any = {};
  Object.assign(query, {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  });
  return query;
}

describe("seating planner actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the authenticated owner on table creation", async () => {
    const query = createQuery({
      data: { id: "00000000-0000-4000-8000-000000000002" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await saveSeatingTableAction({
      tableName: "Family",
      capacity: 8,
    });

    expect(result.error).toBeNull();
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, table_name: "Family" }),
    );
  });

  it("rejects anonymous writes before querying tables", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    } as any);

    const result = await saveSeatingTableAction({
      tableName: "Family",
      capacity: 8,
    });

    expect(result.error?.code).toBe("UNAUTHORIZED");
    expect(from).not.toHaveBeenCalled();
  });
});
