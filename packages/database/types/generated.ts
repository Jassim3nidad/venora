/**
 * DATABASE TYPES.
 *
 * Regenerate from a live Supabase instance when possible:
 *   pnpm db:types
 *   (supabase gen types typescript --local > packages/database/types/generated.ts)
 *
 * This file predates that workflow being consistently run and has been
 * hand-maintained/extended since — most recently to add the payments
 * platform tables, enums, and RPCs from migrations 037-041 (refunds,
 * invoices, receipts, payment_webhook_events, RefundStatus,
 * InvoiceStatus, and the confirm_booking_payment/attach_payment_session/
 * etc. function signatures) because no local Postgres instance was
 * available to run the official generator in this environment.
 * Re-run `pnpm db:types` against a live/local database at the next
 * opportunity to confirm these hand-added entries exactly match the
 * live schema, then remove this note.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ──────────────────────────────────────────────────

export type UserRole =
  "customer" | "venue_owner" | "event_coordinator" | "supplier" | "admin";
export type OrgMemberRole = "owner" | "coordinator" | "staff";
export type OrgMemberStatus = "active" | "suspended" | "revoked";
export type OrganizationInvitationStatus =
  "pending" | "accepted" | "revoked" | "expired";
export type AccountStatus =
  "active" | "pending_verification" | "suspended" | "banned";
export type VenueStatus =
  "draft" | "pending_approval" | "published" | "suspended" | "archived";
export type PriceUnit = "per_event" | "per_hour" | "per_pax" | "per_day";
export type IndoorOutdoor = "indoor" | "outdoor" | "both";
export type MediaType = "image" | "video";
export type AvailabilityStatus =
  "available" | "reserved" | "tentative" | "maintenance" | "blackout";
export type BookingStatus =
  | "pending"
  | "approved"
  | "payment_pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed"
  | "reviewed"
  | "expired";
export type BookingDecisionStatus =
  | "pending_review"
  | "auto_approved"
  | "manually_approved"
  | "rejected_by_rule"
  | "cancelled"
  | "expired";
export type InquiryStatus = "new" | "responded" | "closed";
export type AccreditationStatus =
  "pending" | "accredited" | "rejected" | "suspended";
export type ReviewStatus = "published" | "flagged" | "removed";
export type EventGuestRsvpStatus =
  "pending" | "attending" | "declined" | "tentative";
export type PaymentProvider = "paymongo" | "maya" | "stripe";
export type TransactionStatus =
  "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type RefundStatus =
  "pending" | "processing" | "succeeded" | "failed" | "cancelled";
export type InvoiceStatus = "issued" | "paid" | "void" | "refunded";
export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed";
export type PayoutMethod = "bank" | "gcash" | "paymaya";
export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "failed"
  | "needs_review"
  | "rejected"
  | "cancelled";
export type VerificationType = "venue_owner" | "supplier" | "venue";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type NotificationKind =
  | "booking_update"
  | "payment_update"
  | "review_request"
  | "admin_alert"
  | "supplier_inquiry"
  | "system";
export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationDeliveryStatus =
  "queued" | "sent" | "failed" | "skipped";
export type EventPlanStatus =
  | "draft"
  | "completed"
  | "archived"
  | "converted_to_inquiry"
  | "converted_to_booking";
export type EventPlanCompletionStep =
  | "event-basics"
  | "date-location"
  | "guests-budget"
  | "venue-style"
  | "requirements"
  | "services"
  | "booking-preferences"
  | "summary";
export type VenueProfileRevisionStatus = "draft" | "published" | "archived";
export type VenueSpaceType =
  | "ballroom"
  | "garden"
  | "pavilion"
  | "ceremony_area"
  | "reception_area"
  | "preparation_suite"
  | "custom";
export type VenueSpaceSetting = "indoor" | "outdoor" | "mixed";
export type VenueSpaceCapacityLayout =
  | "banquet"
  | "theatre"
  | "classroom"
  | "cocktail"
  | "u_shape"
  | "boardroom"
  | "standing"
  | "ceremony"
  | "custom";
export type VenueMediaCollectionType =
  "hero" | "gallery" | "space_gallery" | "video" | "logistics";
export type VenueMediaMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "video/mp4"
  | "video/quicktime";
export type VenueMediaModerationStatus = "approved" | "flagged" | "hidden";
export type VenueFaqCategory =
  | "pricing"
  | "booking"
  | "logistics"
  | "suppliers"
  | "accessibility"
  | "policies"
  | "other";
export type PackageVenueSpaceInclusionType =
  "included" | "optional" | "upgrade";

// ─── Database ───────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          display_name: string;
          legal_name: string | null;
          tagline: string | null;
          short_description: string | null;
          about: string | null;
          primary_category: string | null;
          year_established: number | null;
          logo_path: string | null;
          cover_image_path: string | null;
          city: string | null;
          province: string | null;
          country_code: string | null;
          private_address: string | null;
          address_visibility: Database["public"]["Enums"]["business_visibility_level"];
          public_email: string | null;
          email_visibility: boolean;
          public_phone: string | null;
          phone_visibility: boolean;
          website_url: string | null;
          publication_status: Database["public"]["Enums"]["business_publication_status"];
          verification_status: string;
          current_publication_id: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          display_name: string;
          legal_name?: string | null;
          tagline?: string | null;
          short_description?: string | null;
          about?: string | null;
          primary_category?: string | null;
          year_established?: number | null;
          logo_path?: string | null;
          cover_image_path?: string | null;
          city?: string | null;
          province?: string | null;
          country_code?: string | null;
          private_address?: string | null;
          address_visibility?: Database["public"]["Enums"]["business_visibility_level"];
          public_email?: string | null;
          email_visibility?: boolean;
          public_phone?: string | null;
          phone_visibility?: boolean;
          website_url?: string | null;
          publication_status?: Database["public"]["Enums"]["business_publication_status"];
          verification_status?: string;
          current_publication_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          slug?: string;
          display_name?: string;
          legal_name?: string | null;
          tagline?: string | null;
          short_description?: string | null;
          about?: string | null;
          primary_category?: string | null;
          year_established?: number | null;
          logo_path?: string | null;
          cover_image_path?: string | null;
          city?: string | null;
          province?: string | null;
          country_code?: string | null;
          private_address?: string | null;
          address_visibility?: Database["public"]["Enums"]["business_visibility_level"];
          public_email?: string | null;
          email_visibility?: boolean;
          public_phone?: string | null;
          phone_visibility?: boolean;
          website_url?: string | null;
          publication_status?: Database["public"]["Enums"]["business_publication_status"];
          verification_status?: string;
          current_publication_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_profile_publications: {
        Row: {
          id: string;
          business_profile_id: string;
          version_number: number;
          snapshot: Json;
          created_by: string;
          created_at: string;
          published_at: string | null;
          moderation_status: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          version_number: number;
          snapshot: Json;
          created_by: string;
          created_at?: string;
          published_at?: string | null;
          moderation_status?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          version_number?: number;
          snapshot?: Json;
          created_by?: string;
          created_at?: string;
          published_at?: string | null;
          moderation_status?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
      };
      business_profile_venues: {
        Row: {
          id: string;
          business_profile_id: string;
          venue_id: string;
          is_featured: boolean;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          venue_id: string;
          is_featured?: boolean;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          venue_id?: string;
          is_featured?: boolean;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_portfolio_items: {
        Row: {
          id: string;
          business_profile_id: string;
          title: string;
          event_type: string | null;
          description: string | null;
          event_year: number | null;
          cover_image_path: string | null;
          associated_venue_id: string | null;
          is_featured: boolean;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          title: string;
          event_type?: string | null;
          description?: string | null;
          event_year?: number | null;
          cover_image_path?: string | null;
          associated_venue_id?: string | null;
          is_featured?: boolean;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          title?: string;
          event_type?: string | null;
          description?: string | null;
          event_year?: number | null;
          cover_image_path?: string | null;
          associated_venue_id?: string | null;
          is_featured?: boolean;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_team_members: {
        Row: {
          id: string;
          business_profile_id: string;
          full_name: string;
          position: string | null;
          biography: string | null;
          photo_path: string | null;
          associated_venue_id: string | null;
          years_of_experience: number | null;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          full_name: string;
          position?: string | null;
          biography?: string | null;
          photo_path?: string | null;
          associated_venue_id?: string | null;
          years_of_experience?: number | null;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          full_name?: string;
          position?: string | null;
          biography?: string | null;
          photo_path?: string | null;
          associated_venue_id?: string | null;
          years_of_experience?: number | null;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_social_links: {
        Row: {
          id: string;
          business_profile_id: string;
          platform: string;
          url: string;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          platform: string;
          url: string;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          platform?: string;
          url?: string;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_profile_policies: {
        Row: {
          id: string;
          business_profile_id: string;
          policy_type: string;
          title: string;
          summary: string;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_profile_id: string;
          policy_type: string;
          title: string;
          summary: string;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_profile_id?: string;
          policy_type?: string;
          title?: string;
          summary?: string;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ── Identity & Access ─────────────────────────────────

      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          status: AccountStatus;
          profile_setup_completed_at: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          status?: AccountStatus;
          profile_setup_completed_at?: string | null;
          preferences?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      user_roles: {
        Row: {
          user_id: string;
          role: UserRole;
          granted_at: string;
        };
        Insert: { user_id: string; role: UserRole; granted_at?: string };
        Update: never;
      };

      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          business_registration_no: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["organizations"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<
          Database["public"]["Tables"]["organizations"]["Insert"]
        >;
      };

      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrgMemberRole;
          invited_at: string;
          status: OrgMemberStatus;
          invited_by: string | null;
          updated_at: string;
          suspended_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: OrgMemberRole;
          invited_at?: string;
          status?: OrgMemberStatus;
          invited_by?: string | null;
          updated_at?: string;
          suspended_at?: string | null;
          revoked_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_members"]["Insert"]
        >;
      };

      organization_member_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          token_hash: string;
          role: OrgMemberRole;
          status: OrganizationInvitationStatus;
          invited_by: string;
          accepted_by: string | null;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          token_hash: string;
          role?: OrgMemberRole;
          status?: OrganizationInvitationStatus;
          invited_by: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_member_invitations"]["Insert"]
        >;
      };

      // ── Venue Lookups ─────────────────────────────────────

      venue_categories: {
        Row: { id: string; name: string; slug: string };
        Insert: { id?: string; name: string; slug: string };
        Update: Partial<
          Database["public"]["Tables"]["venue_categories"]["Insert"]
        >;
      };

      event_types: {
        Row: { id: string; name: string; slug: string };
        Insert: { id?: string; name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["event_types"]["Insert"]>;
      };

      amenities: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };

      // ── Venue Domain ──────────────────────────────────────

      venues: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          ai_generated_description: string | null;
          province: string;
          city: string;
          municipality: string | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          capacity_min: number | null;
          capacity_max: number;
          base_price: number;
          price_unit: PriceUnit;
          indoor_outdoor: IndoorOutdoor;
          air_conditioned: boolean;
          parking_available: boolean;
          overnight_accommodation: boolean;
          pet_friendly: boolean;
          wheelchair_accessible: boolean;
          has_pool: boolean;
          ceremony_venue: boolean;
          reception_venue: boolean;
          operating_hours: Json | null;
          cancellation_policy: string | null;
          venue_rules: string | null;
          status: VenueStatus;
          is_featured: boolean;
          featured_until: string | null;
          avg_rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venues"]["Row"],
          "id" | "avg_rating" | "review_count" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
      };

      venue_category_assignments: {
        Row: { venue_id: string; category_id: string };
        Insert: { venue_id: string; category_id: string };
        Update: never;
      };

      venue_event_types: {
        Row: { venue_id: string; event_type_id: string };
        Insert: { venue_id: string; event_type_id: string };
        Update: never;
      };

      venue_amenities: {
        Row: { venue_id: string; amenity_id: string };
        Insert: { venue_id: string; amenity_id: string };
        Update: never;
      };

      venue_images: {
        Row: {
          id: string;
          venue_id: string;
          storage_path: string;
          media_type: MediaType;
          alt_text: string | null;
          display_order: number;
          is_featured: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venue_images"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venue_images"]["Insert"]>;
      };

      venue_packages: {
        Row: {
          id: string;
          venue_id: string;
          name: string;
          description: string | null;
          price: number;
          price_unit: PriceUnit;
          min_guests: number | null;
          max_guests: number | null;
          inclusions: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venue_packages"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<
          Database["public"]["Tables"]["venue_packages"]["Insert"]
        >;
      };

      // ── Calendar & Booking ────────────────────────────────

      venue_profile_revisions: {
        Row: {
          id: string;
          venue_id: string;
          status: VenueProfileRevisionStatus;
          revision_number: number;
          created_from_revision_id: string | null;
          published_at: string | null;
          published_by: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          status?: VenueProfileRevisionStatus;
          revision_number?: number;
          created_from_revision_id?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_profile_revisions"]["Insert"]
        >;
      };

      venue_spaces: {
        Row: {
          id: string;
          revision_id: string;
          venue_id: string;
          space_key: string;
          name: string;
          slug: string;
          space_type: VenueSpaceType | null;
          setting: VenueSpaceSetting;
          short_description: string | null;
          description: string | null;
          capacity_min: number | null;
          capacity_max: number;
          accessibility_summary: string | null;
          restrictions: string | null;
          operating_notes: string | null;
          display_order: number;
          status: VenueProfileRevisionStatus;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          revision_id: string;
          venue_id: string;
          space_key?: string;
          name: string;
          slug: string;
          space_type?: VenueSpaceType | null;
          setting: VenueSpaceSetting;
          short_description?: string | null;
          description?: string | null;
          capacity_min?: number | null;
          capacity_max: number;
          accessibility_summary?: string | null;
          restrictions?: string | null;
          operating_notes?: string | null;
          display_order?: number;
          status?: VenueProfileRevisionStatus;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_spaces"]["Insert"]>;
      };

      venue_space_capacity_layouts: {
        Row: {
          id: string;
          space_id: string;
          layout: VenueSpaceCapacityLayout;
          custom_layout_label: string | null;
          capacity: number;
          notes: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          layout: VenueSpaceCapacityLayout;
          custom_layout_label?: string | null;
          capacity: number;
          notes?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_space_capacity_layouts"]["Insert"]
        >;
      };

      venue_space_amenities: {
        Row: {
          space_id: string;
          amenity_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          space_id: string;
          amenity_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_space_amenities"]["Insert"]
        >;
      };

      venue_space_event_types: {
        Row: {
          space_id: string;
          event_type_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          space_id: string;
          event_type_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_space_event_types"]["Insert"]
        >;
      };

      venue_media_collections: {
        Row: {
          id: string;
          revision_id: string;
          venue_id: string;
          space_id: string | null;
          collection_type: VenueMediaCollectionType;
          title: string | null;
          description: string | null;
          display_order: number;
          is_cover: boolean;
          status: VenueProfileRevisionStatus;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          revision_id: string;
          venue_id: string;
          space_id?: string | null;
          collection_type: VenueMediaCollectionType;
          title?: string | null;
          description?: string | null;
          display_order?: number;
          is_cover?: boolean;
          status?: VenueProfileRevisionStatus;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_media_collections"]["Insert"]
        >;
      };

      venue_media_items: {
        Row: {
          id: string;
          collection_id: string;
          venue_id: string;
          space_id: string | null;
          storage_path: string;
          legacy_venue_image_id: string | null;
          media_type: MediaType;
          mime_type: VenueMediaMimeType | null;
          alt_text: string | null;
          caption: string | null;
          transcript: string | null;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          display_order: number;
          is_featured: boolean;
          status: VenueProfileRevisionStatus;
          moderation_status: VenueMediaModerationStatus;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          venue_id: string;
          space_id?: string | null;
          storage_path: string;
          legacy_venue_image_id?: string | null;
          media_type: MediaType;
          mime_type?: VenueMediaMimeType | null;
          alt_text?: string | null;
          caption?: string | null;
          transcript?: string | null;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          display_order?: number;
          is_featured?: boolean;
          status?: VenueProfileRevisionStatus;
          moderation_status?: VenueMediaModerationStatus;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_media_items"]["Insert"]
        >;
      };

      venue_logistics: {
        Row: {
          id: string;
          revision_id: string;
          venue_id: string;
          parking_summary: string | null;
          parking_capacity: number | null;
          accessibility_summary: string | null;
          loading_area_notes: string | null;
          load_in_notes: string | null;
          catering_policy: string | null;
          outside_supplier_policy: string | null;
          alcohol_policy: string | null;
          noise_policy: string | null;
          curfew_time: string | null;
          security_notes: string | null;
          restroom_notes: string | null;
          weather_contingency: string | null;
          status: VenueProfileRevisionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          revision_id: string;
          venue_id: string;
          parking_summary?: string | null;
          parking_capacity?: number | null;
          accessibility_summary?: string | null;
          loading_area_notes?: string | null;
          load_in_notes?: string | null;
          catering_policy?: string | null;
          outside_supplier_policy?: string | null;
          alcohol_policy?: string | null;
          noise_policy?: string | null;
          curfew_time?: string | null;
          security_notes?: string | null;
          restroom_notes?: string | null;
          weather_contingency?: string | null;
          status?: VenueProfileRevisionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_logistics"]["Insert"]
        >;
      };

      venue_faqs: {
        Row: {
          id: string;
          revision_id: string;
          venue_id: string;
          question: string;
          answer: string;
          category: VenueFaqCategory | null;
          display_order: number;
          status: VenueProfileRevisionStatus;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          revision_id: string;
          venue_id: string;
          question: string;
          answer: string;
          category?: VenueFaqCategory | null;
          display_order?: number;
          status?: VenueProfileRevisionStatus;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_faqs"]["Insert"]>;
      };

      package_venue_spaces: {
        Row: {
          id: string;
          package_id: string;
          space_id: string;
          venue_id: string;
          inclusion_type: PackageVenueSpaceInclusionType;
          inclusion_notes: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          space_id: string;
          venue_id: string;
          inclusion_type?: PackageVenueSpaceInclusionType;
          inclusion_notes?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["package_venue_spaces"]["Insert"]
        >;
      };

      venue_availability: {
        Row: {
          id: string;
          venue_id: string;
          date: string;
          status: AvailabilityStatus;
          seasonal_price_override: number | null;
          note: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venue_availability"]["Row"],
          "id"
        > & { id?: string };
        Update: Partial<
          Database["public"]["Tables"]["venue_availability"]["Insert"]
        >;
      };

      inquiries: {
        Row: {
          id: string;
          venue_id: string;
          customer_id: string;
          message: string;
          status: InquiryStatus;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["inquiries"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: { status?: InquiryStatus };
      };

      bookings: {
        Row: {
          id: string;
          venue_id: string;
          customer_id: string;
          package_id: string | null;
          event_date: string;
          event_start_time: string | null;
          event_end_time: string | null;
          event_type_id: string | null;
          guest_count: number;
          status: BookingStatus;
          decision_status: BookingDecisionStatus;
          approval_source: "automation" | "human" | null;
          total_amount: number | null;
          deposit_amount: number | null;
          special_requests: string | null;
          created_at: string;
          updated_at: string;
          approved_at: string | null;
          payment_due_at: string | null;
          payment_started_at: string | null;
          paid_at: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          reviewed_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["bookings"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: {
          venue_id?: string;
          customer_id?: string;
          package_id?: string | null;
          event_date?: string;
          event_start_time?: string | null;
          event_end_time?: string | null;
          event_type_id?: string | null;
          guest_count?: number;
          status?: BookingStatus;
          decision_status?: BookingDecisionStatus;
          approval_source?: "automation" | "human" | null;
          total_amount?: number | null;
          deposit_amount?: number | null;
          special_requests?: string | null;
          approved_at?: string | null;
          payment_due_at?: string | null;
          payment_started_at?: string | null;
          paid_at?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          reviewed_at?: string | null;
        };
      };

      event_plans: {
        Row: {
          id: string;
          customer_id: string;
          event_type_id: string | null;
          title: string | null;
          event_name: string | null;
          event_type_key: string;
          custom_event_type: string | null;
          date_preference_type: string;
          exact_event_date: string | null;
          date_range_start: string | null;
          date_range_end: string | null;
          preferred_month: number | null;
          preferred_year: number | null;
          preferred_day_of_week: string | null;
          preferred_time_of_day: string | null;
          province: string | null;
          city: string | null;
          nearby_locations_allowed: boolean | null;
          expected_guest_count: number | null;
          guest_count_range: string | null;
          guest_count_min: number | null;
          guest_count_max: number | null;
          budget_min: number | null;
          budget_max: number | null;
          budget_preference: string | null;
          currency: "PHP";
          venue_styles: string[];
          setting_preference: string | null;
          ranked_priorities: string[];
          required_amenities: string[];
          additional_requirements: string | null;
          services_needed: string[];
          custom_service: string | null;
          service_selection_mode: string;
          package_preference: string | null;
          accredited_supplier_preference: string | null;
          payment_preference: string | null;
          booking_urgency: string | null;
          decision_maker_type: string | null;
          status: EventPlanStatus;
          completion_step: EventPlanCompletionStep;
          source_draft_fingerprint: string | null;
          converted_inquiry_id: string | null;
          converted_booking_id: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
          converted_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          event_type_id?: string | null;
          title?: string | null;
          event_name?: string | null;
          event_type_key: string;
          custom_event_type?: string | null;
          date_preference_type?: string;
          exact_event_date?: string | null;
          date_range_start?: string | null;
          date_range_end?: string | null;
          preferred_month?: number | null;
          preferred_year?: number | null;
          preferred_day_of_week?: string | null;
          preferred_time_of_day?: string | null;
          province?: string | null;
          city?: string | null;
          nearby_locations_allowed?: boolean | null;
          expected_guest_count?: number | null;
          guest_count_range?: string | null;
          guest_count_min?: number | null;
          guest_count_max?: number | null;
          budget_min?: number | null;
          budget_max?: number | null;
          budget_preference?: string | null;
          currency?: "PHP";
          venue_styles?: string[];
          setting_preference?: string | null;
          ranked_priorities?: string[];
          required_amenities?: string[];
          additional_requirements?: string | null;
          services_needed?: string[];
          custom_service?: string | null;
          service_selection_mode?: string;
          package_preference?: string | null;
          accredited_supplier_preference?: string | null;
          payment_preference?: string | null;
          booking_urgency?: string | null;
          decision_maker_type?: string | null;
          status?: EventPlanStatus;
          completion_step?: EventPlanCompletionStep;
          source_draft_fingerprint?: string | null;
          converted_inquiry_id?: string | null;
          converted_booking_id?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
          converted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["event_plans"]["Insert"]>;
      };

      booking_automation_decisions: {
        Row: {
          id: string;
          booking_id: string;
          venue_id: string;
          outcome: BookingDecisionStatus;
          rules: Json;
          ai_verdict:
            "eligible" | "manual_review" | "high_risk" | "unavailable" | null;
          ai_confidence: number | null;
          ai_explanation: string | null;
          risk_flags: string[];
          model: string | null;
          overridden_at: string | null;
          overridden_by: string | null;
          override_reason: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["booking_automation_decisions"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          rules?: Json;
          risk_flags?: string[];
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["booking_automation_decisions"]["Insert"]
        >;
      };

      venue_auto_accept_settings: {
        Row: {
          venue_id: string;
          enabled: boolean;
          minimum_notice_hours: number;
          maximum_guest_count: number | null;
          allowed_weekdays: number[];
          allowed_start_time: string | null;
          allowed_end_time: string | null;
          minimum_duration_minutes: number | null;
          maximum_duration_minutes: number | null;
          minimum_booking_amount: number | null;
          require_standard_package: boolean;
          require_deposit: boolean;
          require_verified_customer: boolean;
          allowed_event_type_ids: string[] | null;
          confidence_threshold: number;
          review_window_minutes: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venue_auto_accept_settings"]["Row"],
          "created_at" | "updated_at"
        > & {
          enabled?: boolean;
          minimum_notice_hours?: number;
          allowed_weekdays?: number[];
          require_standard_package?: boolean;
          require_deposit?: boolean;
          require_verified_customer?: boolean;
          confidence_threshold?: number;
          review_window_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["venue_auto_accept_settings"]["Insert"]
        >;
      };

      venue_auto_accept_manual_review_customers: {
        Row: {
          venue_id: string;
          customer_id: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venue_auto_accept_manual_review_customers"]["Row"],
          "created_at"
        > & { created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["venue_auto_accept_manual_review_customers"]["Insert"]
        >;
      };

      event_guests: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          guest_group: string | null;
          plus_ones_allowed: number;
          dietary_requirements: string | null;
          accessibility_notes: string | null;
          rsvp_status: EventGuestRsvpStatus;
          rsvp_token: string | null;
          invitation_sent_at: string | null;
          rsvp_deadline: string | null;
          rsvp_responded_at: string | null;
          rsvp_revoked_at: string | null;
          rsvp_invitation_delivered_at: string | null;
          rsvp_reminder_sent_at: string | null;
          rsvp_delivery_error: string | null;
          plus_ones_attending: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          guest_group?: string | null;
          plus_ones_allowed?: number;
          dietary_requirements?: string | null;
          accessibility_notes?: string | null;
          rsvp_status?: EventGuestRsvpStatus;
          rsvp_token?: string | null;
          invitation_sent_at?: string | null;
          rsvp_deadline?: string | null;
          rsvp_responded_at?: string | null;
          rsvp_revoked_at?: string | null;
          rsvp_invitation_delivered_at?: string | null;
          rsvp_reminder_sent_at?: string | null;
          rsvp_delivery_error?: string | null;
          plus_ones_attending?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          guest_group?: string | null;
          plus_ones_allowed?: number;
          dietary_requirements?: string | null;
          accessibility_notes?: string | null;
          rsvp_status?: EventGuestRsvpStatus;
          rsvp_token?: string | null;
          invitation_sent_at?: string | null;
          rsvp_deadline?: string | null;
          rsvp_responded_at?: string | null;
          rsvp_revoked_at?: string | null;
          rsvp_invitation_delivered_at?: string | null;
          rsvp_reminder_sent_at?: string | null;
          rsvp_delivery_error?: string | null;
          plus_ones_attending?: number;
          updated_at?: string;
        };
      };

      event_seating_tables: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          table_name: string;
          capacity: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          table_name: string;
          capacity?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          booking_id?: string | null;
          table_name?: string;
          capacity?: number;
          notes?: string | null;
        };
      };

      event_seating_assignments: {
        Row: {
          id: string;
          table_id: string;
          guest_id: string;
          seat_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          guest_id: string;
          seat_number?: number | null;
          created_at?: string;
        };
        Update: {
          table_id?: string;
          guest_id?: string;
          seat_number?: number | null;
        };
      };

      event_timeline_tasks: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          title: string;
          description: string | null;
          start_time: string | null;
          end_time: string | null;
          owner_name: string | null;
          supplier_id: string | null;
          status: "todo" | "in_progress" | "completed" | "cancelled";
          priority: "low" | "medium" | "high" | "urgent";
          depends_on_task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          title: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          owner_name?: string | null;
          supplier_id?: string | null;
          status?: "todo" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "medium" | "high" | "urgent";
          depends_on_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          title?: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          owner_name?: string | null;
          supplier_id?: string | null;
          status?: "todo" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "medium" | "high" | "urgent";
          depends_on_task_id?: string | null;
          updated_at?: string;
        };
      };

      booking_status_history: {
        Row: {
          id: string;
          booking_id: string;
          status: BookingStatus;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: never; // written by trigger only
        Update: never;
      };

      favorites: {
        Row: { customer_id: string; venue_id: string; created_at: string };
        Insert: { customer_id: string; venue_id: string };
        Update: never;
      };

      // ── Supplier Domain ───────────────────────────────────

      supplier_categories: {
        Row: { id: string; name: string; slug: string };
        Insert: { id?: string; name: string; slug: string };
        Update: Partial<
          Database["public"]["Tables"]["supplier_categories"]["Insert"]
        >;
      };

      supplier_profiles: {
        Row: {
          id: string;
          profile_id: string;
          business_name: string;
          slug: string;
          category_id: string | null;
          headline: string | null;
          description: string | null;
          base_price: number | null;
          price_unit: PriceUnit | null;
          service_areas: string[];
          coverage_radius_km: number | null;
          contact_email: string | null;
          contact_phone: string | null;
          website_url: string | null;
          instagram_url: string | null;
          profile_image_url: string | null;
          hero_image_url: string | null;
          business_location_type: string;
          location_visibility: string;
          latitude: number | null;
          longitude: number | null;
          city: string | null;
          province: string | null;
          country: string | null;
          business_address: string | null;
          public_location_label: string | null;
          travel_available: boolean;
          travel_fee_note: string | null;
          response_time_hours: number;
          years_in_business: number | null;
          team_size: number | null;
          minimum_booking_notice_days: number;
          is_featured: boolean;
          published_at: string | null;
          accreditation_status: AccreditationStatus;
          avg_rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_profiles"]["Row"],
          | "id"
          | "avg_rating"
          | "review_count"
          | "service_areas"
          | "response_time_hours"
          | "minimum_booking_notice_days"
          | "is_featured"
          | "business_location_type"
          | "location_visibility"
          | "latitude"
          | "longitude"
          | "city"
          | "province"
          | "country"
          | "business_address"
          | "public_location_label"
          | "travel_available"
          | "travel_fee_note"
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          service_areas?: string[];
          response_time_hours?: number;
          minimum_booking_notice_days?: number;
          is_featured?: boolean;
          business_location_type?: string;
          location_visibility?: string;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          province?: string | null;
          country?: string | null;
          business_address?: string | null;
          public_location_label?: string | null;
          travel_available?: boolean;
          travel_fee_note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_profiles"]["Insert"]
        >;
      };

      supplier_services: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          description: string | null;
          price: number | null;
          price_unit: PriceUnit | null;
          package_type: string;
          inclusions: string[];
          min_guests: number | null;
          max_guests: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_services"]["Row"],
          | "id"
          | "package_type"
          | "inclusions"
          | "is_active"
          | "sort_order"
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          package_type?: string;
          inclusions?: string[];
          is_active?: boolean;
          sort_order?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_services"]["Insert"]
        >;
      };

      supplier_portfolio_items: {
        Row: {
          id: string;
          supplier_id: string;
          title: string | null;
          description: string | null;
          image_url: string | null;
          image_urls: string[];
          event_type: string | null;
          city: string | null;
          province: string | null;
          event_date: string | null;
          is_featured: boolean;
          sort_order: number;
          status: string;
          service_id: string | null;
          venue_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_portfolio_items"]["Row"],
          | "id"
          | "is_featured"
          | "sort_order"
          | "status"
          | "image_urls"
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          is_featured?: boolean;
          sort_order?: number;
          status?: string;
          image_urls?: string[];
        };
        Update: Partial<
          Database["public"]["Tables"]["supplier_portfolio_items"]["Insert"]
        >;
      };

      supplier_contact_requests: {
        Row: {
          id: string;
          supplier_id: string;
          service_id: string | null;
          customer_id: string | null;
          booking_id: string | null;
          venue_id: string | null;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          event_date: string | null;
          event_location: string | null;
          guest_count: number | null;
          venue_name_snapshot: string | null;
          event_start_time_snapshot: string | null;
          location_snapshot: string | null;
          event_date_snapshot: string | null;
          guest_count_snapshot: number | null;
          message: string;
          status: InquiryStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_contact_requests"]["Row"],
          "id" | "status" | "created_at" | "updated_at"
        > & { id?: string; status?: InquiryStatus };
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["supplier_contact_requests"]["Row"],
            "status" | "updated_at"
          >
        >;
      };

      venue_suppliers: {
        Row: { venue_id: string; supplier_id: string; is_preferred: boolean };
        Insert: {
          venue_id: string;
          supplier_id: string;
          is_preferred?: boolean;
        };
        Update: { is_preferred?: boolean };
      };

      booking_suppliers: {
        Row: {
          id: string;
          booking_id: string;
          supplier_id: string;
          service_id: string | null;
          agreed_price: number | null;
          status: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["booking_suppliers"]["Row"],
          "id"
        > & { id?: string };
        Update: { agreed_price?: number; status?: string };
      };

      // ── Reviews ───────────────────────────────────────────

      reviews: {
        Row: {
          id: string;
          booking_id: string;
          customer_id: string;
          venue_id: string;
          overall_rating: number;
          venue_quality: number | null;
          cleanliness: number | null;
          staff_service: number | null;
          facilities: number | null;
          accessibility: number | null;
          value_for_money: number | null;
          food_quality: number | null;
          ambience: number | null;
          comment: string | null;
          owner_reply: string | null;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: {
          comment?: string;
          owner_reply?: string;
          status?: ReviewStatus;
        };
      };

      supplier_reviews: {
        Row: {
          id: string;
          booking_supplier_id: string;
          customer_id: string;
          supplier_id: string;
          overall_rating: number;
          comment: string | null;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_reviews"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: { comment?: string; status?: ReviewStatus };
      };

      // ── AI ────────────────────────────────────────────────

      ai_search_logs: {
        Row: {
          id: string;
          user_id: string | null;
          query_text: string;
          parsed_filters: Json | null;
          results_count: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_search_logs"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: never;
      };

      ai_recommendation_events: {
        Row: {
          id: string;
          user_id: string | null;
          venue_id: string | null;
          reason: Json | null;
          shown_at: string;
          clicked: boolean;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_recommendation_events"]["Row"],
          "id" | "shown_at"
        > & { id?: string };
        Update: { clicked?: boolean };
      };

      ai_generated_content: {
        Row: {
          id: string;
          venue_id: string | null;
          content_type: string;
          prompt: string | null;
          generated_text: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_generated_content"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: { generated_text?: string; status?: string };
      };

      ai_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          created_at: string;
        };
        Insert: { id?: string; user_id?: string | null; session_id: string };
        Update: never;
      };

      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_messages"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: never;
      };

      // ── Admin / Payments ──────────────────────────────────

      ai_action_requests: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          tool_name: "cancel_booking";
          arguments: Json;
          status: "proposed" | "confirmed" | "executed" | "rejected" | "failed";
          error_message: string | null;
          created_at: string;
          confirmed_at: string | null;
          executed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          tool_name: "cancel_booking";
          arguments?: Json;
          status?:
            "proposed" | "confirmed" | "executed" | "rejected" | "failed";
          error_message?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
          executed_at?: string | null;
        };
        Update: {
          status?:
            "proposed" | "confirmed" | "executed" | "rejected" | "failed";
          error_message?: string | null;
          confirmed_at?: string | null;
          executed_at?: string | null;
        };
      };

      commission_rules: {
        Row: {
          id: string;
          scope: "global" | "category" | "venue";
          reference_id: string | null;
          percentage: number | null;
          flat_fee: number | null;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["commission_rules"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: Partial<
          Database["public"]["Tables"]["commission_rules"]["Insert"]
        >;
      };

      transactions: {
        Row: {
          id: string;
          booking_id: string;
          amount: number;
          commission_amount: number;
          payment_provider: PaymentProvider;
          provider_reference: string | null;
          status: TransactionStatus;
          currency: string;
          payment_kind: string;
          checkout_url: string | null;
          paid_at: string | null;
          failed_at: string | null;
          failure_reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          amount: number;
          commission_amount?: number;
          payment_provider: PaymentProvider;
          provider_reference?: string | null;
          status?: TransactionStatus;
          currency?: string;
          payment_kind?: string;
          checkout_url?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          failure_reason?: string | null;
          metadata?: Json;
        };
        Update: {
          status?: TransactionStatus;
          provider_reference?: string | null;
          checkout_url?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          failure_reason?: string | null;
          metadata?: Json;
        };
      };

      refunds: {
        Row: {
          id: string;
          booking_id: string;
          transaction_id: string;
          amount: number;
          currency: string;
          status: RefundStatus;
          reason: string | null;
          requested_by: string | null;
          payment_provider: PaymentProvider;
          provider_reference: string | null;
          failure_reason: string | null;
          processed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          transaction_id: string;
          amount: number;
          currency?: string;
          status?: RefundStatus;
          reason?: string | null;
          requested_by?: string | null;
          payment_provider: PaymentProvider;
          provider_reference?: string | null;
          failure_reason?: string | null;
          processed_at?: string | null;
          metadata?: Json;
        };
        Update: {
          status?: RefundStatus;
          provider_reference?: string | null;
          failure_reason?: string | null;
          processed_at?: string | null;
          metadata?: Json;
        };
      };

      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          booking_id: string;
          customer_id: string;
          organization_id: string | null;
          status: InvoiceStatus;
          currency: string;
          line_items: Json;
          total_amount: number;
          amount_due: number;
          amount_paid: number;
          issued_at: string;
          due_at: string | null;
          paid_at: string | null;
          voided_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoices"]["Row"],
          "id" | "invoice_number" | "issued_at" | "created_at" | "updated_at"
        > & { id?: string; invoice_number?: string };
        Update: {
          status?: InvoiceStatus;
          amount_due?: number;
          amount_paid?: number;
          paid_at?: string | null;
          voided_at?: string | null;
          metadata?: Json;
        };
      };

      receipts: {
        Row: {
          id: string;
          receipt_number: string;
          invoice_id: string | null;
          transaction_id: string;
          booking_id: string;
          customer_id: string;
          amount: number;
          currency: string;
          payment_provider: PaymentProvider;
          provider_reference: string | null;
          issued_at: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["receipts"]["Row"],
          "id" | "receipt_number" | "issued_at" | "created_at"
        > & { id?: string; receipt_number?: string };
        Update: never;
      };

      payment_webhook_events: {
        Row: {
          id: string;
          provider: PaymentProvider;
          event_id: string;
          event_type: string;
          payload: Json;
          status: "processing" | "processed" | "failed" | "skipped";
          error: string | null;
          received_at: string;
          processed_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["payment_webhook_events"]["Row"],
          "id" | "received_at"
        > & { id?: string };
        Update: {
          status?: "processing" | "processed" | "failed" | "skipped";
          error?: string | null;
          processed_at?: string | null;
        };
      };

      payouts: {
        Row: {
          id: string;
          booking_id: string | null;
          organization_id: string | null;
          supplier_id: string | null;
          amount: number;
          currency: string;
          status: PayoutStatus;
          scheduled_at: string | null;
          paid_at: string | null;
          withdrawal_request_id: string | null;
          parent_payout_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payouts"]["Row"], "id"> & {
          id?: string;
        };
        Update: { status?: PayoutStatus; paid_at?: string };
      };

      payout_accounts: {
        Row: {
          id: string;
          organization_id: string | null;
          supplier_id: string | null;
          method: PayoutMethod;
          account_name: string;
          bank_name: string | null;
          account_number_last4: string;
          /**
           * AES-256-GCM envelope produced in the app layer. `authenticated`
           * holds no SELECT grant on this column — only service_role can
           * read it back.
           */
          account_identifier_ciphertext: string;
          account_fingerprint: string;
          is_default: boolean;
          verified_at: string | null;
          verification_reference: string | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["payout_accounts"]["Row"],
          | "id"
          | "bank_name"
          | "is_default"
          | "verified_at"
          | "verification_reference"
          | "archived_at"
          | "created_by"
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          bank_name?: string | null;
          is_default?: boolean;
          created_by?: string | null;
        };
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["payout_accounts"]["Row"],
            | "account_name"
            | "bank_name"
            | "account_number_last4"
            | "account_identifier_ciphertext"
            | "account_fingerprint"
            | "is_default"
            | "archived_at"
          >
        >;
      };

      withdrawal_requests: {
        Row: {
          id: string;
          organization_id: string | null;
          supplier_id: string | null;
          payout_account_id: string;
          amount: number;
          currency: string;
          status: WithdrawalStatus;
          idempotency_key: string;
          requested_by: string;
          requested_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          payment_provider: PaymentProvider | null;
          provider_reference: string | null;
          failure_reason: string | null;
          processed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        // Rows are created only by request_withdrawal(); there is no
        // INSERT policy or grant for any client role.
        Insert: never;
        Update: never;
      };

      verification_requests: {
        Row: {
          id: string;
          profile_id: string | null;
          organization_id: string | null;
          type: VerificationType;
          submitted_documents: Json | null;
          status: VerificationStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["verification_requests"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: {
          status?: VerificationStatus;
          reviewed_by?: string;
          reviewed_at?: string;
          notes?: string;
        };
      };

      // ── Notifications & Audit ─────────────────────────────

      notifications: {
        Row: {
          id: string;
          user_id: string;
          channel: NotificationChannel;
          kind: NotificationKind;
          actor_id: string | null;
          title: string;
          body: string | null;
          link: string | null;
          metadata: Json;
          priority: NotificationPriority;
          is_read: boolean;
          read_at: string | null;
          expires_at: string | null;
          dedupe_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel?: NotificationChannel;
          kind?: NotificationKind;
          actor_id?: string | null;
          title: string;
          body?: string | null;
          link?: string | null;
          metadata?: Json;
          priority?: NotificationPriority;
          is_read?: boolean;
          read_at?: string | null;
          expires_at?: string | null;
          dedupe_key?: string | null;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };

      notification_preferences: {
        Row: {
          user_id: string;
          email_enabled: boolean;
          sms_enabled: boolean;
          push_enabled: boolean;
          in_app_enabled: boolean;
          booking_updates: boolean;
          payment_updates: boolean;
          review_requests: boolean;
          admin_alerts: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["notification_preferences"]["Row"],
          "created_at" | "updated_at"
        > & {
          email_enabled?: boolean;
          sms_enabled?: boolean;
          push_enabled?: boolean;
          in_app_enabled?: boolean;
          booking_updates?: boolean;
          payment_updates?: boolean;
          review_requests?: boolean;
          admin_alerts?: boolean;
          timezone?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["notification_preferences"]["Insert"],
            "user_id"
          >
        >;
      };

      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          disabled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["push_subscriptions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          disabled_at?: string | null;
        };
      };

      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          channel: NotificationChannel;
          status: NotificationDeliveryStatus;
          provider: string | null;
          provider_message_id: string | null;
          error_message: string | null;
          attempt_count: number;
          next_attempt_at: string | null;
          attempted_at: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          user_id: string;
          channel: NotificationChannel;
          status?: NotificationDeliveryStatus;
          provider?: string | null;
          provider_message_id?: string | null;
          error_message?: string | null;
          attempt_count?: number;
          next_attempt_at?: string | null;
          attempted_at?: string | null;
          sent_at?: string | null;
        };
        Update: {
          status?: NotificationDeliveryStatus;
          provider?: string | null;
          provider_message_id?: string | null;
          error_message?: string | null;
          attempt_count?: number;
          next_attempt_at?: string | null;
          attempted_at?: string | null;
          sent_at?: string | null;
        };
      };

      notification_webhook_config: {
        Row: {
          name: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          value?: string;
          updated_at?: string;
        };
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: never; // written via log_audit() SECURITY DEFINER function only
        Update: never;
      };
    };

    // ── Views ──────────────────────────────────────────────
    Views: {
      mv_venue_monthly_stats: {
        Row: {
          venue_id: string;
          month: string;
          booking_count: number;
          revenue: number | null;
          commission: number | null;
          avg_rating: number | null;
          review_count: number;
        };
      };
    };

    // ── Functions ──────────────────────────────────────────
    Functions: {
      has_role: { Args: { p_role: UserRole }; Returns: boolean };
      is_admin: { Returns: boolean };
      owns_venue: { Args: { p_venue_id: string }; Returns: boolean };
      is_org_member_for_venue: {
        Args: { p_venue_id: string };
        Returns: boolean;
      };
      is_booking_customer: { Args: { p_booking_id: string }; Returns: boolean };
      owns_booking_venue: { Args: { p_booking_id: string }; Returns: boolean };
      accept_organization_member_invitation: {
        Args: { p_token: string };
        Returns: Array<{
          organization_id: string;
          user_id: string;
          member_status: OrgMemberStatus;
        }>;
      };
      process_booking_auto_accept: {
        Args: { p_booking_id: string; p_ai_evaluation?: Json | null };
        Returns: Database["public"]["Tables"]["booking_automation_decisions"]["Row"];
      };
      override_booking_automation_decision: {
        Args: {
          p_booking_id: string;
          p_action: "manual_review" | "reject";
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };

      // ── Payments (migrations 021, 037-041) ────────────────
      start_booking_payment: {
        Args: {
          p_booking_id: string;
          p_payment_provider: PaymentProvider;
          p_checkout_url?: string | null;
          p_provider_reference?: string | null;
        };
        Returns: Database["public"]["Tables"]["transactions"]["Row"];
      };
      attach_payment_session: {
        Args: {
          p_transaction_id: string;
          p_provider_reference: string;
          p_checkout_url: string;
          p_metadata?: Json;
          p_force?: boolean;
        };
        Returns: Database["public"]["Tables"]["transactions"]["Row"];
      };
      confirm_booking_payment: {
        Args: {
          p_payment_provider: PaymentProvider;
          p_checkout_reference: string;
          p_payment_reference: string;
          p_amount_minor: number;
          p_currency: string;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      fail_booking_payment: {
        Args: {
          p_booking_id: string;
          p_payment_provider: PaymentProvider;
          p_provider_reference: string;
          p_failure_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      request_booking_refund: {
        Args: { p_booking_id: string; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["refunds"]["Row"];
      };
      mark_refund_processing: {
        Args: { p_refund_id: string; p_provider_reference: string };
        Returns: Database["public"]["Tables"]["refunds"]["Row"];
      };
      complete_booking_refund: {
        Args: {
          p_payment_provider: PaymentProvider;
          p_provider_reference: string;
          p_amount?: number | null;
        };
        Returns: Database["public"]["Tables"]["refunds"]["Row"];
      };
      fail_booking_refund: {
        Args: {
          p_payment_provider: PaymentProvider;
          p_provider_reference: string;
          p_failure_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["refunds"]["Row"];
      };
      claim_payment_webhook_event: {
        Args: {
          p_provider: PaymentProvider;
          p_event_id: string;
          p_event_type: string;
          p_payload: Json;
        };
        Returns: boolean;
      };
      finish_payment_webhook_event: {
        Args: {
          p_provider: PaymentProvider;
          p_event_id: string;
          p_status: string;
          p_error?: string | null;
        };
        Returns: void;
      };
      calculate_commission: {
        Args: { p_venue_id: string; p_amount: number };
        Returns: number;
      };
      match_venues: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_province?: string;
          filter_city?: string;
          filter_capacity?: number;
          filter_max_price?: number;
        };
        Returns: Array<{
          id: string;
          name: string;
          slug: string;
          city: string;
          base_price: number;
          avg_rating: number;
          similarity: number;
        }>;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string;
          p_metadata?: Json;
        };
        Returns: void;
      };
      ensure_notification_preferences: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["notification_preferences"]["Row"];
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: void;
      };
      mark_all_notifications_read: {
        Returns: number;
      };
      disable_sms_notification_deliveries: {
        Returns: number;
      };
      retry_failed_notification_deliveries: {
        Args: { p_limit?: number };
        Returns: number;
      };
      get_venue_analytics: {
        Args: {
          p_venue_id: string;
          p_from?: string;
          p_to?: string;
          p_granularity?: string;
        };
        Returns: Array<{
          period: string;
          booking_count: number;
          revenue: number;
          commission: number;
          avg_rating: number;
        }>;
      };
    };

    // ── Enums ──────────────────────────────────────────────
    Enums: {
      business_visibility_level:
        "exact" | "city_province" | "province" | "hidden";
      business_publication_status:
        "incomplete" | "draft" | "published" | "changes_pending" | "suspended";

      user_role: UserRole;
      org_member_role: OrgMemberRole;
      org_member_status: OrgMemberStatus;
      organization_invitation_status: OrganizationInvitationStatus;
      account_status: AccountStatus;
      venue_status: VenueStatus;
      price_unit: PriceUnit;
      indoor_outdoor: IndoorOutdoor;
      media_type: MediaType;
      availability_status: AvailabilityStatus;
      booking_status: BookingStatus;
      booking_decision_status: BookingDecisionStatus;
      inquiry_status: InquiryStatus;
      accreditation_status: AccreditationStatus;
      review_status: ReviewStatus;
      payment_provider: PaymentProvider;
      transaction_status: TransactionStatus;
      refund_status: RefundStatus;
      invoice_status: InvoiceStatus;
      verification_type: VerificationType;
      verification_status: VerificationStatus;
      notification_kind: NotificationKind;
      notification_channel: NotificationChannel;
      notification_priority: NotificationPriority;
      notification_delivery_status: NotificationDeliveryStatus;
    };
  };
}

// ─── Helpers ────────────────────────────────────────────────

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
