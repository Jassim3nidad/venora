import { describe, expect, it } from "vitest";

type AccessInput = {
  isCustomer: boolean;
  isAdmin: boolean;
  isOrgOwner: boolean;
  isMember: boolean;
  hasMessagePermission: boolean;
  isAssignedToVenue: boolean;
  inquiryClosed: boolean;
};

export function canSendVenueInquiryMessage(input: AccessInput): {
  allowed: boolean;
  role: "customer" | "venue_team" | null;
  reason?: string;
} {
  if (input.isCustomer) {
    if (input.inquiryClosed) {
      return { allowed: false, role: null, reason: "closed" };
    }
    return { allowed: true, role: "customer" };
  }

  if (input.isAdmin || input.isOrgOwner) {
    if (input.inquiryClosed) {
      return { allowed: false, role: null, reason: "closed" };
    }
    return { allowed: true, role: "venue_team" };
  }

  if (!input.isMember) {
    return { allowed: false, role: null, reason: "not_member" };
  }

  if (!input.hasMessagePermission) {
    return { allowed: false, role: null, reason: "missing_permission" };
  }

  if (!input.isAssignedToVenue) {
    return { allowed: false, role: null, reason: "not_assigned" };
  }

  if (input.inquiryClosed) {
    return { allowed: false, role: null, reason: "closed" };
  }

  return { allowed: true, role: "venue_team" };
}

describe("venue inquiry messaging access", () => {
  it("allows customers on open inquiries", () => {
    expect(
      canSendVenueInquiryMessage({
        isCustomer: true,
        isAdmin: false,
        isOrgOwner: false,
        isMember: false,
        hasMessagePermission: false,
        isAssignedToVenue: false,
        inquiryClosed: false,
      }),
    ).toEqual({ allowed: true, role: "customer" });
  });

  it("blocks coordinators without message permission", () => {
    expect(
      canSendVenueInquiryMessage({
        isCustomer: false,
        isAdmin: false,
        isOrgOwner: false,
        isMember: true,
        hasMessagePermission: false,
        isAssignedToVenue: true,
        inquiryClosed: false,
      }).reason,
    ).toBe("missing_permission");
  });

  it("blocks coordinators not assigned to the venue", () => {
    expect(
      canSendVenueInquiryMessage({
        isCustomer: false,
        isAdmin: false,
        isOrgOwner: false,
        isMember: true,
        hasMessagePermission: true,
        isAssignedToVenue: false,
        inquiryClosed: false,
      }).reason,
    ).toBe("not_assigned");
  });

  it("allows assigned coordinators with messaging permission", () => {
    expect(
      canSendVenueInquiryMessage({
        isCustomer: false,
        isAdmin: false,
        isOrgOwner: false,
        isMember: true,
        hasMessagePermission: true,
        isAssignedToVenue: true,
        inquiryClosed: false,
      }),
    ).toEqual({ allowed: true, role: "venue_team" });
  });
});
