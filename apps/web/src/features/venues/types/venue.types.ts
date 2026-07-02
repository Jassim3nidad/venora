import type { PriceUnit } from "@venora/database";

export interface VenueMedia {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  alt_text: string | null;
  display_order: number;
  is_featured: boolean;
}

export interface VenuePackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: PriceUnit;
  min_guests: number | null;
  max_guests: number | null;
  inclusions: string[];
}

export interface VenueProfileData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ai_generated_description: string | null;
  address: string;
  city: string;
  province: string;
  indoor_outdoor: string | null;
  is_featured: boolean;
  capacity_min: number | null;
  capacity_max: number;
  base_price: number;
  price_unit: PriceUnit;
  parking_available: boolean;
  wheelchair_accessible: boolean;
  avg_rating: number | null;
  review_count: number | null;
  venue_images: VenueMedia[];
  venue_packages: VenuePackage[];
  organizations?: { name: string | null } | null;
}
