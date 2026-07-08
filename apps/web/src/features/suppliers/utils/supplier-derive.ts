import type { SupplierMarketplaceProfile } from "../types/supplier.types";

export function getSupplierStartingPrice(supplier: SupplierMarketplaceProfile) {
  const packagePrices = supplier.packages
    .filter((pkg) => pkg.isActive && typeof pkg.price === "number")
    .map((pkg) => pkg.price as number);

  if (packagePrices.length > 0) return Math.min(...packagePrices);
  return supplier.basePrice;
}

export function getSupplierHeroImage(supplier: SupplierMarketplaceProfile) {
  return (
    supplier.heroImageUrl ||
    supplier.portfolio.find((item) => item.isFeatured)?.imageUrl ||
    supplier.portfolio[0]?.imageUrl ||
    supplier.profileImageUrl ||
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=80"
  );
}

export function supplierSearchText(supplier: SupplierMarketplaceProfile) {
  return [
    supplier.businessName,
    supplier.headline,
    supplier.description,
    supplier.category?.name,
    supplier.category?.slug,
    ...supplier.serviceAreas,
    ...supplier.packages.map((pkg) => `${pkg.name} ${pkg.description ?? ""}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
