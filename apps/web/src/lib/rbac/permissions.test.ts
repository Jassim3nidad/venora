import { describe, expect, it } from "vitest";
import { ADMIN_TIERS, ADMIN_TIER_PERMISSIONS, tierHasPermission } from "./permissions";

describe("admin tier permissions", () => {
  it("gives super_admin every permission in the catalog", () => {
    const allPermissionsFlattened = new Set(
      ADMIN_TIERS.flatMap((tier) => ADMIN_TIER_PERMISSIONS[tier]),
    );
    for (const permission of allPermissionsFlattened) {
      expect(tierHasPermission("super_admin", permission)).toBe(true);
    }
  });

  it("keeps analyst strictly read-only — no mutation permission anywhere", () => {
    const mutationVerbs = ["manage", "approve", "reject", "suspend", "override", "moderate", "reactivate", "verify"];
    for (const permission of ADMIN_TIER_PERMISSIONS.analyst) {
      const isMutation = mutationVerbs.some((verb) => permission.endsWith(`.${verb}`));
      expect(isMutation, `analyst should not have mutation permission "${permission}"`).toBe(false);
    }
  });

  it("only super_admin and admin can view administrator accounts", () => {
    for (const tier of ADMIN_TIERS) {
      const expected = tier === "super_admin" || tier === "admin";
      expect(tierHasPermission(tier, "admin_accounts.view")).toBe(expected);
    }
  });

  it("reserves admin_roles.manage (tier assignment) for super_admin only", () => {
    for (const tier of ADMIN_TIERS) {
      expect(tierHasPermission(tier, "admin_roles.manage")).toBe(tier === "super_admin");
    }
  });

  it("gives finance_admin commission management but not marketplace moderation", () => {
    expect(tierHasPermission("finance_admin", "commissions.manage")).toBe(true);
    expect(tierHasPermission("finance_admin", "marketplace.moderate")).toBe(false);
  });

  it("has no duplicate permissions within a single tier's list", () => {
    for (const tier of ADMIN_TIERS) {
      const permissions = ADMIN_TIER_PERMISSIONS[tier];
      expect(new Set(permissions).size).toBe(permissions.length);
    }
  });
});
