import { describe, expect, it } from "vitest";
import { resolveCoordinatorEmailFlow } from "./invitation-email-flow";

describe("resolveCoordinatorEmailFlow", () => {
  it("uses an invite email when admin lookup confirms the user is new", () => {
    expect(resolveCoordinatorEmailFlow(false)).toBe("invite");
  });

  it("uses a magic link when admin lookup confirms the user already exists", () => {
    expect(resolveCoordinatorEmailFlow(true)).toBe("magic_link");
  });

  it("falls back to a magic link when admin lookup is unavailable", () => {
    expect(resolveCoordinatorEmailFlow(null)).toBe("magic_link");
  });
});
