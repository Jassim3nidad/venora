import { describe, expect, it } from "vitest";
import { getCostEstimatorDefaultValues } from "./CostEstimatorForm";

describe("cost estimator defaults", () => {
  it("uses the booking guest count when provided", () => {
    expect(
      getCostEstimatorDefaultValues({
        initialGuestCount: 200,
        capacityMin: 50,
      }),
    ).toMatchObject({ guestCount: 200 });
  });

  it("falls back to the venue minimum capacity", () => {
    expect(getCostEstimatorDefaultValues({ capacityMin: 50 })).toMatchObject({
      guestCount: 50,
    });
  });
});
