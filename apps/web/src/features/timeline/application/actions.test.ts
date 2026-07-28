import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { saveTimelineTaskAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const userId = "00000000-0000-4000-8000-000000000001";

function queryResult(result: unknown) {
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

describe("timeline task actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes authenticated ownership", async () => {
    const query = queryResult({
      data: { id: "00000000-0000-4000-8000-000000000002" },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
      from: vi.fn(() => query),
    } as any);

    const result = await saveTimelineTaskAction({ title: "Confirm menu" });

    expect(result.error).toBeNull();
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, title: "Confirm menu" }),
    );
  });

  it("rejects anonymous writes", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    } as any);

    const result = await saveTimelineTaskAction({ title: "Confirm menu" });

    expect(result.error?.code).toBe("UNAUTHORIZED");
    expect(from).not.toHaveBeenCalled();
  });
});
