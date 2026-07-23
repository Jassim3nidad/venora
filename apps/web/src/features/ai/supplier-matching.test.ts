import { describe, it, expect } from "vitest";
import { filterEligibleSuppliers, CandidateSupplier } from "./supplier-matching";

describe("AI Supplier Matching Deterministic Eligibility Filter", () => {
  it("should exclude inactive or unaccredited suppliers", () => {
    const list: CandidateSupplier[] = [
      { id: "s1", name: "Accredited Catering", category: "catering", is_accredited: true, status: "active", city: "Manila", rating: 4.8 },
      { id: "s2", name: "Unaccredited Catering", category: "catering", is_accredited: false, status: "active", city: "Manila", rating: 4.5 },
      { id: "s3", name: "Inactive Photo", category: "photography", is_accredited: true, status: "inactive", city: "Manila", rating: 4.9 },
    ];

    const eligible = filterEligibleSuppliers(list, "catering");
    expect(eligible).toHaveLength(1);
    expect(eligible[0]?.id).toBe("s1");
  });
});
