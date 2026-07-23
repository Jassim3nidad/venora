export interface CandidateSupplier {
  id: string;
  name: string;
  category: string;
  is_accredited: boolean;
  status: string;
  city: string | null;
  rating: number | null;
}

export function filterEligibleSuppliers(
  suppliers: CandidateSupplier[],
  categoryFilter?: string,
  cityFilter?: string
): CandidateSupplier[] {
  return suppliers.filter((s) => {
    if (s.status !== "active" || !s.is_accredited) {
      return false;
    }
    if (categoryFilter && s.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (cityFilter && s.city && s.city.toLowerCase() !== cityFilter.toLowerCase()) {
      return false;
    }
    return true;
  });
}
