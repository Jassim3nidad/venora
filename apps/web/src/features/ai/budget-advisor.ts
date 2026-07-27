export interface BudgetBreakdown {
  venueBase: number;
  cateringEstimate: number;
  decorAndMedia: number;
  contingency: number;
  totalEstimated: number;
  remainingBudget: number;
  isOverBudget: boolean;
}

export function calculateDeterministicBudget(
  totalBudget: number,
  venueBasePrice: number,
  guestCount: number,
): BudgetBreakdown {
  const cateringPerHead = 800; // PHP 800 per guest average
  const cateringEstimate = guestCount * cateringPerHead;
  const decorAndMedia = Math.round(totalBudget * 0.15);
  const contingency = Math.round(totalBudget * 0.05);

  const totalEstimated =
    venueBasePrice + cateringEstimate + decorAndMedia + contingency;
  const remainingBudget = totalBudget - totalEstimated;

  return {
    venueBase: venueBasePrice,
    cateringEstimate,
    decorAndMedia,
    contingency,
    totalEstimated,
    remainingBudget,
    isOverBudget: remainingBudget < 0,
  };
}
