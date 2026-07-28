import { describe, expect, it } from "vitest";
import { seatingAssignmentSchema, seatingTableSchema } from "./seating.schema";

describe("seating planner schemas", () => {
  it("normalizes table input", () => {
    expect(
      seatingTableSchema.parse({
        tableName: "  Family A  ",
        capacity: "8",
        notes: "",
      }),
    ).toMatchObject({
      tableName: "Family A",
      capacity: 8,
      notes: null,
    });
  });

  it("rejects unsafe capacities and seat numbers", () => {
    expect(
      seatingTableSchema.safeParse({ tableName: "A", capacity: 0 }).success,
    ).toBe(false);
    expect(
      seatingAssignmentSchema.safeParse({
        tableId: "00000000-0000-4000-8000-000000000001",
        guestId: "00000000-0000-4000-8000-000000000002",
        seatNumber: 101,
      }).success,
    ).toBe(false);
  });
});
