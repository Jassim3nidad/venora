import { describe, expect, it } from "vitest";
import { isSafeInternalRedirect } from "./profile-setup";

describe("isSafeInternalRedirect", () => {
  it("accepts normal internal app routes", () => {
    expect(isSafeInternalRedirect("/account")).toBe(true);
    expect(
      isSafeInternalRedirect("/bookings?activity=supplier-inquiries"),
    ).toBe(true);
    expect(isSafeInternalRedirect("/dashboard/supplier")).toBe(true);
  });

  it("rejects external and protocol-smuggling redirects", () => {
    expect(isSafeInternalRedirect("https://attacker.example")).toBe(false);
    expect(isSafeInternalRedirect("//attacker.example")).toBe(false);
    expect(isSafeInternalRedirect("/\\attacker.example")).toBe(false);
    expect(isSafeInternalRedirect("/%2f%2fattacker.example")).toBe(false);
    expect(isSafeInternalRedirect("/%252f%252fattacker.example")).toBe(false);
    expect(isSafeInternalRedirect("/javascript:alert(1)")).toBe(false);
    expect(isSafeInternalRedirect("/data:text/html,hi")).toBe(false);
  });

  it("rejects auth-loop destinations", () => {
    expect(isSafeInternalRedirect("/login")).toBe(false);
    expect(isSafeInternalRedirect("/reset-password")).toBe(false);
    expect(isSafeInternalRedirect("/auth/callback")).toBe(false);
  });
});
