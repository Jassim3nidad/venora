import { describe, expect, it } from "vitest";
import { getNavbarProfile } from "./get-navbar-profile";

/**
 * Minimal supabase stub: getNavbarProfile only ever issues two selects,
 * one against profiles and one against user_roles. It must NOT issue a
 * third -- the role flags are derived from the single user_roles read.
 */
function supabaseStub(roles: string[]) {
  const calls: string[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        calls.push(table);
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { full_name: "QA superAdmin", avatar_url: null },
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: async () => ({ data: roles.map((role) => ({ role })) }),
          }),
        };
      },
    },
  };
}

describe("getNavbarProfile", () => {
  it("returns isAdmin for a user holding the admin role", async () => {
    const { client } = supabaseStub(["admin"]);
    const profile = await getNavbarProfile(client, "user-1");

    expect(profile?.isAdmin).toBe(true);
  });

  it("does not return isAdmin for a customer", async () => {
    const { client } = supabaseStub(["customer"]);
    const profile = await getNavbarProfile(client, "user-1");

    expect(profile?.isAdmin).toBe(false);
  });

  it("keeps the other role flags independent of admin", async () => {
    const { client } = supabaseStub(["venue_owner", "admin"]);
    const profile = await getNavbarProfile(client, "user-1");

    expect(profile?.isAdmin).toBe(true);
    expect(profile?.isVenueOwner).toBe(true);
    expect(profile?.isSupplier).toBe(false);
    expect(profile?.isCoordinator).toBe(false);
  });

  it("derives every flag from one user_roles read, adding no query", async () => {
    const { client, calls } = supabaseStub(["admin"]);
    await getNavbarProfile(client, "user-1");

    expect(calls.filter((t) => t === "user_roles")).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it("returns null without a user id", async () => {
    const { client, calls } = supabaseStub(["admin"]);

    expect(await getNavbarProfile(client, null)).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
