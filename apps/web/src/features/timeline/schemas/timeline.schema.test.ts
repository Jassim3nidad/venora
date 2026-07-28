import { describe, expect, it } from "vitest";
import { timelineTaskSchema } from "./timeline.schema";

describe("timeline task schema", () => {
  it("normalizes optional task fields", () => {
    expect(
      timelineTaskSchema.parse({
        title: "  Confirm menu  ",
        description: "",
        ownerName: "",
      }),
    ).toMatchObject({
      title: "Confirm menu",
      description: null,
      ownerName: null,
      status: "todo",
      priority: "medium",
    });
  });

  it("rejects reversed time ranges and self dependencies", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      timelineTaskSchema.safeParse({
        id,
        title: "Setup",
        startTime: "2026-08-01T10:00:00.000Z",
        endTime: "2026-08-01T09:00:00.000Z",
        dependsOnTaskId: id,
      }).success,
    ).toBe(false);
  });
});
