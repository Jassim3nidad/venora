import type { Database } from "@venora/database/types/generated";

export type BusinessProfileRow = Database["public"]["Tables"]["business_profiles"]["Row"];
export type BusinessProfileInsert = Database["public"]["Tables"]["business_profiles"]["Insert"];
export type BusinessProfileUpdate = Database["public"]["Tables"]["business_profiles"]["Update"];

export type BusinessVisibilityLevel = Database["public"]["Enums"]["business_visibility_level"];
export type BusinessPublicationStatus = Database["public"]["Enums"]["business_publication_status"];

export type BusinessProfileVenueRow = Database["public"]["Tables"]["business_profile_venues"]["Row"];
export type BusinessPortfolioItemRow = Database["public"]["Tables"]["business_portfolio_items"]["Row"];
export type BusinessTeamMemberRow = Database["public"]["Tables"]["business_team_members"]["Row"];
export type BusinessSocialLinkRow = Database["public"]["Tables"]["business_social_links"]["Row"];
export type BusinessProfilePolicyRow = Database["public"]["Tables"]["business_profile_policies"]["Row"];
export type BusinessProfilePublicationRow = Database["public"]["Tables"]["business_profile_publications"]["Row"];

export type BusinessProfileDraft = BusinessProfileRow & {
  venues?: BusinessProfileVenueRow[];
  published_venues?: Array<{
    id: string;
    name: string;
    slug: string | null;
  }>;
  portfolio?: BusinessPortfolioItemRow[];
  team?: BusinessTeamMemberRow[];
  social_links?: BusinessSocialLinkRow[];
  policies?: BusinessProfilePolicyRow[];
};

export type BusinessProfilePublicView = {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  shortDescription: string | null;
  about: string | null;
  primaryCategory: string | null;
  yearEstablished: number | null;
  logoPath: string | null;
  coverImagePath: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  verificationStatus: string;
  venues: BusinessProfileVenueRow[];
  portfolio: BusinessPortfolioItemRow[];
  team: BusinessTeamMemberRow[];
  socialLinks: BusinessSocialLinkRow[];
  policies: BusinessProfilePolicyRow[];
};
