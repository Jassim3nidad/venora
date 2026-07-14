import { describe, expect, it } from "vitest";
import { GET } from "../../../app/api/debug/route";

describe("GET /api/debug", () => {
  it("is unavailable without exposing data or internal errors", async () => {
    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
