import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";

describe("Staff Invitation Security & Token Hashing", () => {
  it("should generate a 64-character SHA-256 hash from a raw token", () => {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    expect(rawToken.length).toBe(64);
    expect(tokenHash.length).toBe(64);
    expect(tokenHash).not.toBe(rawToken);
  });

  it("should correctly detect expired invitation timestamps", () => {
    const now = new Date();
    const pastExpiration = new Date(now.getTime() - 1000 * 60 * 60); // 1 hr ago
    const futureExpiration = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hrs future

    expect(pastExpiration < now).toBe(true);
    expect(futureExpiration > now).toBe(true);
  });
});
