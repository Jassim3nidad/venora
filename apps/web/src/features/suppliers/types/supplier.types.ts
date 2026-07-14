import type { AccreditationStatus, PriceUnit } from "@venora/database";

export type SupplierCategory = {
  id: string;
  name: string;
  slug: string;
};

export type SupplierPackage = {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  price: number | null;
  priceUnit: PriceUnit | null;
  packageType: string;
  inclusions: string[];
  minGuests: number | null;
  maxGuests: number | null;
  isActive: boolean;
  sortOrder: number;
};

export type SupplierPortfolioItem = {
  id: string;
  supplierId: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  eventType: string | null;
  city: string | null;
  province: string | null;
  eventDate: string | null;
  isFeatured: boolean;
  sortOrder: number;
  status: "draft" | "published" | "hidden";
  serviceId: string | null;
  venueName: string | null;
};

export type SupplierReview = {
  id: string;
  supplierId: string;
  overallRating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  customerAvatarUrl: string | null;
};

export type SupplierMarketplaceProfile = {
  id: string;
  profileId: string;
  businessName: string;
  slug: string;
  category: SupplierCategory | null;
  headline: string | null;
  description: string | null;
  basePrice: number | null;
  priceUnit: PriceUnit | null;
  serviceAreas: string[];
  coverageRadiusKm: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  profileImageUrl: string | null;
  heroImageUrl: string | null;
  responseTimeHours: number;
  yearsInBusiness: number | null;
  teamSize: number | null;
  minimumBookingNoticeDays: number;
  isFeatured: boolean;
  accreditationStatus: AccreditationStatus;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  packages: SupplierPackage[];
  portfolio: SupplierPortfolioItem[];
  reviews: SupplierReview[];
};

export type SupplierFilters = {
  q?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  accreditedOnly?: boolean;
  sort?: "recommended" | "rating" | "price" | "newest";
};

export type SupplierListResult = {
  suppliers: SupplierMarketplaceProfile[];
  categories: SupplierCategory[];
};

export type SupplierDashboardContext = {
  profile: SupplierMarketplaceProfile | null;
  categories: SupplierCategory[];
};
