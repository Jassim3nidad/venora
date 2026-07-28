import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicGuestRsvpSchema } from "../schemas/guest.schema";

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "supabase/migrations/20260728110000_public_guest_rsvp.sql",
  ),
  "utf8",
);

describe("public guest RSVP contract", () => {
  it("accepts public response states and rejects internal pending state", () => {
    expect(
      publicGuestRsvpSchema.safeParse({
        token: "11111111-1111-4111-8111-111111111111",
        status: "attending",
        plusOnes: 1,
      }).success,
    ).toBe(true);
    expect(
      publicGuestRsvpSchema.safeParse({
        token: "11111111-1111-4111-8111-111111111111",
        status: "pending",
        plusOnes: 0,
      }).success,
    ).toBe(false);
  });

  it("uses token-scoped security-definer RPCs without anon table grants", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.get_guest_rsvp_invitation",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.respond_to_guest_rsvp",
    );
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).not.toMatch(/GRANT\s+SELECT.*event_guests.*anon/is);
  });

  it("enforces deadline, revocation, and plus-one bounds", () => {
    expect(migration).toContain("rsvp_revoked_at IS NULL");
    expect(migration).toContain("rsvp_deadline >= now()");
    expect(migration).toContain("p_plus_ones > v_guest.plus_ones_allowed");
  });
});
