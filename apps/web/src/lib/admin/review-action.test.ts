import { describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  createReviewActionSchema,
  throwIfReviewActionError,
} from "./review-action";

describe("throwIfReviewActionError", () => {
  it("does nothing when there is no error", () => {
    expect(() => throwIfReviewActionError(null)).not.toThrow();
    expect(() => throwIfReviewActionError(undefined)).not.toThrow();
  });

  it("maps permission-check failures to ForbiddenError", () => {
    expect(() =>
      throwIfReviewActionError({
        message:
          "You do not have permission to perform this venue review action",
      }),
    ).toThrow(ForbiddenError);
  });

  it("maps 'not found' failures to NotFoundError without duplicating the phrase", () => {
    try {
      throwIfReviewActionError({ message: "Venue not found" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).message).toBe("Venue not found");
      expect((error as NotFoundError).message).not.toContain(
        "not found not found",
      );
    }
  });

  it("maps every other Postgres RAISE EXCEPTION message to ValidationError", () => {
    expect(() =>
      throwIfReviewActionError({
        message: "A reason is required to reject a venue",
      }),
    ).toThrow(ValidationError);
  });
});

describe("createReviewActionSchema", () => {
  const schema = createReviewActionSchema(["approve", "reject", "note"]);

  it("accepts a valid action with a uuid id", () => {
    const result = schema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an action outside the allowed list", () => {
    const result = schema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      action: "delete_everything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    const result = schema.safeParse({ id: "not-a-uuid", action: "approve" });
    expect(result.success).toBe(false);
  });

  it("treats reason as optional and trims whitespace", () => {
    const result = schema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      action: "note",
      reason: "  needs a follow-up  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reason).toBe("needs a follow-up");
  });
});
