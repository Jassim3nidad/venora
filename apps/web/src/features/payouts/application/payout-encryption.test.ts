import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptAccountIdentifier,
  encryptAccountIdentifier,
  fingerprintAccountIdentifier,
  lastFourDigits,
  normalizeAccountIdentifier,
} from "./payout-encryption";

const KEY = crypto.randomBytes(32).toString("base64");
const OTHER_KEY = crypto.randomBytes(32).toString("base64");

describe("payout account encryption", () => {
  beforeEach(() => {
    process.env.PAYOUT_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    delete process.env.PAYOUT_ENCRYPTION_KEY;
  });

  it("round-trips an account identifier", () => {
    const envelope = encryptAccountIdentifier("1234567890123");
    expect(decryptAccountIdentifier(envelope)).toBe("1234567890123");
  });

  it("never leaks the plaintext into the envelope", () => {
    const envelope = encryptAccountIdentifier("1234567890123");
    expect(envelope).not.toContain("1234567890123");
    expect(envelope.startsWith("v1.")).toBe(true);
  });

  it("produces a different envelope every time for the same input", () => {
    // A deterministic envelope would let anyone with read access confirm
    // a guessed account number by comparing ciphertext.
    const a = encryptAccountIdentifier("1234567890123");
    const b = encryptAccountIdentifier("1234567890123");
    expect(a).not.toBe(b);
    expect(decryptAccountIdentifier(a)).toBe(decryptAccountIdentifier(b));
  });

  it("refuses to decrypt with the wrong key", () => {
    const envelope = encryptAccountIdentifier("1234567890123");
    process.env.PAYOUT_ENCRYPTION_KEY = OTHER_KEY;
    expect(() => decryptAccountIdentifier(envelope)).toThrow();
  });

  it("refuses to decrypt a tampered envelope", () => {
    const parts = encryptAccountIdentifier("1234567890123").split(".");
    const ciphertext = parts[3] as string;
    const flipped = `${ciphertext.slice(0, -2)}${ciphertext.slice(-2) === "AA" ? "AB" : "AA"}`;
    expect(() =>
      decryptAccountIdentifier([...parts.slice(0, 3), flipped].join(".")),
    ).toThrow();
  });

  it("rejects a key that is not 32 bytes", () => {
    process.env.PAYOUT_ENCRYPTION_KEY = crypto
      .randomBytes(16)
      .toString("base64");
    expect(() => encryptAccountIdentifier("1234567890123")).toThrow(
      /32 bytes/,
    );
  });

  it("rejects a missing key", () => {
    delete process.env.PAYOUT_ENCRYPTION_KEY;
    expect(() => encryptAccountIdentifier("1234567890123")).toThrow(
      /PAYOUT_ENCRYPTION_KEY/,
    );
  });
});

describe("account identifier normalization", () => {
  beforeEach(() => {
    process.env.PAYOUT_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    delete process.env.PAYOUT_ENCRYPTION_KEY;
  });

  it("strips formatting", () => {
    expect(normalizeAccountIdentifier("1234-5678-9012")).toBe("123456789012");
    expect(normalizeAccountIdentifier("0917 123 4567")).toBe("09171234567");
  });

  it("treats +63 and 0 mobile prefixes as the same number", () => {
    expect(normalizeAccountIdentifier("+639171234567")).toBe("09171234567");
    expect(normalizeAccountIdentifier("09171234567")).toBe("09171234567");
  });

  it("fingerprints equal for equivalent formats, so duplicates collide", () => {
    expect(fingerprintAccountIdentifier("+63 917 123 4567")).toBe(
      fingerprintAccountIdentifier("0917-123-4567"),
    );
  });

  it("fingerprints differ for different accounts", () => {
    expect(fingerprintAccountIdentifier("09171234567")).not.toBe(
      fingerprintAccountIdentifier("09171234568"),
    );
  });

  it("keys the fingerprint, so it is not a plain hash of the number", () => {
    const withKey = fingerprintAccountIdentifier("09171234567");
    const plainHash = crypto
      .createHash("sha256")
      .update("09171234567")
      .digest("base64url");
    expect(withKey).not.toBe(plainHash);
  });

  it("takes the last four digits of the normalized value", () => {
    expect(lastFourDigits("1234-5678-9012")).toBe("9012");
    expect(lastFourDigits("+63 917 123 4567")).toBe("4567");
  });

  it("rejects an identifier with fewer than four digits", () => {
    expect(() => lastFourDigits("12")).toThrow(/at least 4 digits/);
  });
});
