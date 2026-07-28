import type { SupplierMarketplaceProfile } from "../suppliers/types/supplier.types";
import {
  getSupplierStartingPrice,
  supplierSearchText,
} from "../suppliers/utils/supplier-derive";

export type SupplierMatchCriteria = {
  query?: string;
  categorySlug?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
};

export type SupplierMatch = {
  supplier: SupplierMarketplaceProfile;
  score: number;
  reasons: string[];
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function locationText(supplier: SupplierMarketplaceProfile) {
  return [
    supplier.publicLocationLabel,
    supplier.city,
    supplier.province,
    ...supplier.serviceAreas,
  ]
    .filter(Boolean)
    .map(normalize);
}

function queryMatchScore(supplier: SupplierMarketplaceProfile, query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;
  const text = supplierSearchText(supplier);
  const matches = terms.filter((term) => text.includes(term)).length;
  return matches === terms.length ? 40 : 0;
}

export function rankSupplierMatches(
  suppliers: SupplierMarketplaceProfile[],
  criteria: SupplierMatchCriteria = {},
): SupplierMatch[] {
  const categorySlug = normalize(criteria.categorySlug);
  const location = normalize(criteria.location);
  const query = normalize(criteria.query);
  const minPrice = Math.max(0, criteria.minPrice ?? 0);
  const maxPrice = Math.max(0, criteria.maxPrice ?? 0);
  const minRating = Math.max(0, criteria.minRating ?? 0);

  return suppliers
    .filter((supplier) => {
      if (supplier.accreditationStatus !== "accredited") return false;
      if (
        categorySlug &&
        categorySlug !== "all" &&
        normalize(supplier.category?.slug) !== categorySlug
      ) {
        return false;
      }
      if (
        location &&
        !locationText(supplier).some((value) => value === location)
      ) {
        return false;
      }
      if (minRating > 0 && supplier.avgRating < minRating) return false;
      if (query && queryMatchScore(supplier, query) === 0) return false;

      if (minPrice > 0 || maxPrice > 0) {
        const startingPrice = getSupplierStartingPrice(supplier);
        if (startingPrice === null) return false;
        if (minPrice > 0 && startingPrice < minPrice) return false;
        if (maxPrice > 0 && startingPrice > maxPrice) return false;
      }

      return true;
    })
    .map((supplier) => {
      const reasons = ["Venora accredited"];
      let score =
        supplier.avgRating * 10 +
        Math.min(15, Math.log1p(supplier.reviewCount) * 3);

      if (supplier.isFeatured) {
        score += 20;
        reasons.push("Featured supplier");
      }
      if (
        categorySlug &&
        categorySlug !== "all" &&
        normalize(supplier.category?.slug) === categorySlug
      ) {
        score += 35;
        reasons.push("Category match");
      }
      if (
        location &&
        locationText(supplier).some((value) => value === location)
      ) {
        score += 25;
        reasons.push("Serves selected location");
      }
      if (query) {
        score += queryMatchScore(supplier, query);
        reasons.push("Keyword match");
      }
      if (minPrice > 0 || maxPrice > 0) {
        score += 20;
        reasons.push("Within budget");
      }
      if (minRating > 0) {
        score += 10;
        reasons.push("Meets rating target");
      }

      return {
        supplier,
        score: Math.round(score * 100) / 100,
        reasons,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.supplier.businessName.localeCompare(right.supplier.businessName),
    );
}
