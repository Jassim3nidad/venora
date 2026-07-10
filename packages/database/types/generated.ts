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

export type UserRole            = "customer" | "venue_owner" | "event_coordinator" | "supplier" | "admin";
export type OrgMemberRole       = "owner" | "coordinator" | "staff";
export type AccountStatus       = "active" | "pending_verification" | "suspended" | "banned";
export type VenueStatus         = "draft" | "pending_approval" | "published" | "suspended" | "archived";
export type PriceUnit           = "per_event" | "per_hour" | "per_pax" | "per_day";
export type IndoorOutdoor       = "indoor" | "outdoor" | "both";
export type MediaType           = "image" | "video";
export type AvailabilityStatus  = "available" | "reserved" | "tentative" | "maintenance" | "blackout";
export type BookingStatus       = "pending" | "approved" | "payment_pending" | "confirmed" | "declined" | "cancelled" | "completed" | "reviewed" | "expired";
export type InquiryStatus       = "new" | "responded" | "closed";
export type AccreditationStatus = "pending" | "accredited" | "rejected" | "suspended";
export type ReviewStatus        = "published" | "flagged" | "removed";
export type PaymentProvider     = "paymongo" | "maya" | "stripe";
export type TransactionStatus   = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type RefundStatus        = "pending" | "processing" | "succeeded" | "failed" | "cancelled";
export type InvoiceStatus       = "issued" | "paid" | "void" | "refunded";
export type VerificationType    = "venue_owner" | "supplier" | "venue";
export type VerificationStatus  = "pending" | "approved" | "rejected";
export type NotificationKind    = "booking_update" | "payment_update" | "review_request" | "admin_alert" | "supplier_inquiry" | "system";
export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationDeliveryStatus = "queued" | "sent" | "failed" | "skipped";

// ─── Database ───────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ── Identity & Access ─────────────────────────────────

      profiles: {
        Row: {
          id:         string;
          full_name:  string;
          avatar_url: string | null;
          phone:      string | null;
          status:     AccountStatus;
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
          user_id:    string;
          role:       UserRole;
          granted_at: string;
        };
        Insert: { user_id: string; role: UserRole; granted_at?: string };
        Update: never;
      };

      organizations: {
        Row: {
          id:                       string;
          owner_id:                 string;
          name:                     string;
          business_registration_no: string | null;
          created_at:               string;
          updated_at:               string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };

      organization_members: {
        Row: {
          organization_id: string;
          user_id:         string;
          role:            OrgMemberRole;
          invited_at:      string;
        };
        Insert: { organization_id: string; user_id: string; role?: OrgMemberRole };
        Update: Pick<Database["public"]["Tables"]["organization_members"]["Row"], "role">;
      };

      // ── Venue Lookups ─────────────────────────────────────

      venue_categories: {
        Row: { id: string; name: string; slug: string };
        Insert: { id?: string; name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["venue_categories"]["Insert"]>;
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
          id:                       string;
          organization_id:          string;
          name:                     string;
          slug:                     string;
          description:              string | null;
          ai_generated_description: string | null;
          province:                 string;
          city:                     string;
          municipality:             string | null;
          address:                  string;
          latitude:                 number | null;
          longitude:                number | null;
          capacity_min:             number | null;
          capacity_max:             number;
          base_price:               number;
          price_unit:               PriceUnit;
          indoor_outdoor:           IndoorOutdoor;
          air_conditioned:          boolean;
          parking_available:        boolean;
          overnight_accommodation:  boolean;
          pet_friendly:             boolean;
          wheelchair_accessible:    boolean;
          has_pool:                 boolean;
          ceremony_venue:           boolean;
          reception_venue:          boolean;
          operating_hours:          Json | null;
          cancellation_policy:      string | null;
          venue_rules:              string | null;
          status:                   VenueStatus;
          is_featured:              boolean;
          featured_until:           string | null;
          avg_rating:               number;
          review_count:             number;
          created_at:               string;
          updated_at:               string;
        };
        Insert: Omit<Database["public"]["Tables"]["venues"]["Row"], "id" | "avg_rating" | "review_count" | "created_at" | "updated_at"> & { id?: string };
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
          id:            string;
          venue_id:      string;
          storage_path:  string;
          media_type:    MediaType;
          alt_text:      string | null;
          display_order: number;
          is_featured:   boolean;
          created_at:    string;
        };
        Insert: Omit<Database["public"]["Tables"]["venue_images"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venue_images"]["Insert"]>;
      };

      venue_packages: {
        Row: {
          id:          string;
          venue_id:    string;
          name:        string;
          description: string | null;
          price:       number;
          price_unit:  PriceUnit;
          min_guests:  number | null;
          max_guests:  number | null;
          inclusions:  string[];
          is_active:   boolean;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["venue_packages"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venue_packages"]["Insert"]>;
      };

      // ── Calendar & Booking ────────────────────────────────

      venue_availability: {
        Row: {
          id:                      string;
          venue_id:                string;
          date:                    string;
          status:                  AvailabilityStatus;
          seasonal_price_override: number | null;
          note:                    string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["venue_availability"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venue_availability"]["Insert"]>;
      };

      inquiries: {
        Row: {
          id:          string;
          venue_id:    string;
          customer_id: string;
          message:     string;
          status:      InquiryStatus;
          created_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["inquiries"]["Row"], "id" | "created_at"> & { id?: string };
        Update: { status?: InquiryStatus };
      };

      bookings: {
        Row: {
          id:               string;
          venue_id:         string;
          customer_id:      string;
          package_id:       string | null;
          event_date:       string;
          event_start_time: string | null;
          event_end_time:   string | null;
          event_type_id:    string | null;
          guest_count:      number;
          status:           BookingStatus;
          total_amount:     number | null;
          deposit_amount:   number | null;
          special_requests: string | null;
          created_at:       string;
          updated_at:       string;
          approved_at:      string | null;
          payment_due_at:   string | null;
          payment_started_at: string | null;
          paid_at:          string | null;
          confirmed_at:     string | null;
          cancelled_at:     string | null;
          completed_at:     string | null;
          reviewed_at:      string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: {
          venue_id?:         string;
          customer_id?:      string;
          package_id?:       string | null;
          event_date?:       string;
          event_start_time?: string | null;
          event_end_time?:   string | null;
          event_type_id?:    string | null;
          guest_count?:      number;
          status?:           BookingStatus;
          total_amount?:     number | null;
          deposit_amount?:   number | null;
          special_requests?: string | null;
          approved_at?:      string | null;
          payment_due_at?:   string | null;
          payment_started_at?: string | null;
          paid_at?:          string | null;
          confirmed_at?:     string | null;
          cancelled_at?:     string | null;
          completed_at?:     string | null;
          reviewed_at?:      string | null;
        };
      };

      booking_status_history: {
        Row: {
          id:         string;
          booking_id: string;
          status:     BookingStatus;
          changed_by: string | null;
          note:       string | null;
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
        Update: Partial<Database["public"]["Tables"]["supplier_categories"]["Insert"]>;
      };

      supplier_profiles: {
        Row: {
          id:                   string;
          profile_id:           string;
          business_name:        string;
          slug:                 string;
          category_id:          string | null;
          headline:             string | null;
          description:          string | null;
          base_price:           number | null;
          price_unit:           PriceUnit | null;
          service_areas:        string[];
          coverage_radius_km:   number | null;
          contact_email:        string | null;
          contact_phone:        string | null;
          website_url:          string | null;
          instagram_url:        string | null;
          profile_image_url:    string | null;
          hero_image_url:       string | null;
          response_time_hours:  number;
          years_in_business:    number | null;
          team_size:            number | null;
          minimum_booking_notice_days: number;
          is_featured:          boolean;
          published_at:         string | null;
          accreditation_status: AccreditationStatus;
          avg_rating:           number;
          review_count:         number;
          created_at:           string;
          updated_at:           string;
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
          | "created_at"
          | "updated_at"
        > & {
          id?: string;
          service_areas?: string[];
          response_time_hours?: number;
          minimum_booking_notice_days?: number;
          is_featured?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_profiles"]["Insert"]>;
      };

      supplier_services: {
        Row: {
          id:          string;
          supplier_id: string;
          name:        string;
          description: string | null;
          price:       number | null;
          price_unit:  PriceUnit | null;
          package_type: string;
          inclusions:  string[];
          min_guests:  number | null;
          max_guests:  number | null;
          is_active:   boolean;
          sort_order:  number;
          created_at:  string;
          updated_at:  string;
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
        Update: Partial<Database["public"]["Tables"]["supplier_services"]["Insert"]>;
      };

      supplier_portfolio_items: {
        Row: {
          id:          string;
          supplier_id: string;
          title:       string;
          description: string | null;
          image_url:   string;
          event_type:  string | null;
          city:        string | null;
          province:    string | null;
          event_date:  string | null;
          is_featured: boolean;
          sort_order:  number;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["supplier_portfolio_items"]["Row"],
          "id" | "is_featured" | "sort_order" | "created_at" | "updated_at"
        > & {
          id?: string;
          is_featured?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_portfolio_items"]["Insert"]>;
      };

      supplier_contact_requests: {
        Row: {
          id:             string;
          supplier_id:    string;
          service_id:     string | null;
          customer_id:    string | null;
          booking_id:     string | null;
          venue_id:       string | null;
          contact_name:   string;
          contact_email:  string;
          contact_phone:  string | null;
          event_date:     string | null;
          event_location: string | null;
          guest_count:    number | null;
            venue_name_snapshot: string | null;
            event_start_time_snapshot: string | null;
            location_snapshot: string | null;
            event_date_snapshot: string | null;
            guest_count_snapshot: number | null;
          message:        string;
          status:         InquiryStatus;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Omit<Database["public"]["Tables"]["supplier_contact_requests"]["Row"], "id" | "status" | "created_at" | "updated_at"> & { id?: string; status?: InquiryStatus };
        Update: Partial<Pick<Database["public"]["Tables"]["supplier_contact_requests"]["Row"], "status" | "updated_at">>;
      };

      venue_suppliers: {
        Row: { venue_id: string; supplier_id: string; is_preferred: boolean };
        Insert: { venue_id: string; supplier_id: string; is_preferred?: boolean };
        Update: { is_preferred?: boolean };
      };

      booking_suppliers: {
        Row: {
          id:           string;
          booking_id:   string;
          supplier_id:  string;
          service_id:   string | null;
          agreed_price: number | null;
          status:       string;
        };
        Insert: Omit<Database["public"]["Tables"]["booking_suppliers"]["Row"], "id"> & { id?: string };
        Update: { agreed_price?: number; status?: string };
      };

      // ── Reviews ───────────────────────────────────────────

      reviews: {
        Row: {
          id:              string;
          booking_id:      string;
          customer_id:     string;
          venue_id:        string;
          overall_rating:  number;
          venue_quality:   number | null;
          cleanliness:     number | null;
          staff_service:   number | null;
          facilities:      number | null;
          accessibility:   number | null;
          value_for_money: number | null;
          food_quality:    number | null;
          ambience:        number | null;
          comment:         string | null;
          owner_reply:     string | null;
          status:          ReviewStatus;
          created_at:      string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at"> & { id?: string };
        Update: { comment?: string; owner_reply?: string; status?: ReviewStatus };
      };

      supplier_reviews: {
        Row: {
          id:                  string;
          booking_supplier_id: string;
          customer_id:         string;
          supplier_id:         string;
          overall_rating:      number;
          comment:             string | null;
          status:              ReviewStatus;
          created_at:          string;
        };
        Insert: Omit<Database["public"]["Tables"]["supplier_reviews"]["Row"], "id" | "created_at"> & { id?: string };
        Update: { comment?: string; status?: ReviewStatus };
      };

      // ── AI ────────────────────────────────────────────────

      ai_search_logs: {
        Row: {
          id:             string;
          user_id:        string | null;
          query_text:     string;
          parsed_filters: Json | null;
          results_count:  number | null;
          created_at:     string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_search_logs"]["Row"], "id" | "created_at"> & { id?: string };
        Update: never;
      };

      ai_recommendation_events: {
        Row: {
          id:       string;
          user_id:  string | null;
          venue_id: string | null;
          reason:   Json | null;
          shown_at: string;
          clicked:  boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_recommendation_events"]["Row"], "id" | "shown_at"> & { id?: string };
        Update: { clicked?: boolean };
      };

      ai_generated_content: {
        Row: {
          id:             string;
          venue_id:       string | null;
          content_type:   string;
          prompt:         string | null;
          generated_text: string | null;
          status:         string;
          created_at:     string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_generated_content"]["Row"], "id" | "created_at"> & { id?: string };
        Update: { generated_text?: string; status?: string };
      };

      ai_conversations: {
        Row: { id: string; user_id: string | null; session_id: string; created_at: string };
        Insert: { id?: string; user_id?: string | null; session_id: string };
        Update: never;
      };

      ai_messages: {
        Row: {
          id:              string;
          conversation_id: string;
          role:            "user" | "assistant" | "system";
          content:         string;
          created_at:      string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_messages"]["Row"], "id" | "created_at"> & { id?: string };
        Update: never;
      };

      // ── Admin / Payments ──────────────────────────────────

      commission_rules: {
        Row: {
          id:             string;
          scope:          "global" | "category" | "venue";
          reference_id:   string | null;
          percentage:     number | null;
          flat_fee:       number | null;
          effective_from: string;
          effective_to:   string | null;
          created_at:     string;
        };
        Insert: Omit<Database["public"]["Tables"]["commission_rules"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["commission_rules"]["Insert"]>;
      };

      transactions: {
        Row: {
          id:                 string;
          booking_id:         string;
          amount:             number;
          commission_amount:  number;
          payment_provider:   PaymentProvider;
          provider_reference: string | null;
          status:             TransactionStatus;
          currency:           string;
          payment_kind:       string;
          checkout_url:       string | null;
          paid_at:            string | null;
          failed_at:          string | null;
          failure_reason:     string | null;
          metadata:           Json;
          created_at:         string;
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
          id:                 string;
          booking_id:         string;
          transaction_id:     string;
          amount:             number;
          currency:           string;
          status:             RefundStatus;
          reason:             string | null;
          requested_by:       string | null;
          payment_provider:   PaymentProvider;
          provider_reference: string | null;
          failure_reason:     string | null;
          processed_at:       string | null;
          metadata:           Json;
          created_at:         string;
          updated_at:         string;
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
          id:              string;
          invoice_number:  string;
          booking_id:      string;
          customer_id:     string;
          organization_id: string | null;
          status:          InvoiceStatus;
          currency:        string;
          line_items:      Json;
          total_amount:    number;
          amount_due:      number;
          amount_paid:     number;
          issued_at:       string;
          due_at:          string | null;
          paid_at:         string | null;
          voided_at:       string | null;
          metadata:        Json;
          created_at:      string;
          updated_at:      string;
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
          id:                 string;
          receipt_number:     string;
          invoice_id:         string | null;
          transaction_id:     string;
          booking_id:         string;
          customer_id:        string;
          amount:             number;
          currency:           string;
          payment_provider:   PaymentProvider;
          provider_reference: string | null;
          issued_at:          string;
          metadata:           Json;
          created_at:         string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["receipts"]["Row"],
          "id" | "receipt_number" | "issued_at" | "created_at"
        > & { id?: string; receipt_number?: string };
        Update: never;
      };

      payment_webhook_events: {
        Row: {
          id:           string;
          provider:     PaymentProvider;
          event_id:     string;
          event_type:   string;
          payload:      Json;
          status:       "processing" | "processed" | "failed" | "skipped";
          error:        string | null;
          received_at:  string;
          processed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_webhook_events"]["Row"], "id" | "received_at"> & { id?: string };
        Update: { status?: "processing" | "processed" | "failed" | "skipped"; error?: string | null; processed_at?: string | null };
      };

      payouts: {
        Row: {
          id:              string;
          organization_id: string | null;
          supplier_id:     string | null;
          amount:          number;
          status:          string;
          scheduled_at:    string | null;
          paid_at:         string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["payouts"]["Row"], "id"> & { id?: string };
        Update: { status?: string; paid_at?: string };
      };

      verification_requests: {
        Row: {
          id:                   string;
          profile_id:           string | null;
          organization_id:      string | null;
          type:                 VerificationType;
          submitted_documents:  Json | null;
          status:               VerificationStatus;
          reviewed_by:          string | null;
          reviewed_at:          string | null;
          notes:                string | null;
          created_at:           string;
        };
        Insert: Omit<Database["public"]["Tables"]["verification_requests"]["Row"], "id" | "created_at"> & { id?: string };
        Update: { status?: VerificationStatus; reviewed_by?: string; reviewed_at?: string; notes?: string };
      };

      // ── Notifications & Audit ─────────────────────────────

      notifications: {
        Row: {
          id:         string;
          user_id:    string;
          channel:    NotificationChannel;
          kind:       NotificationKind;
          actor_id:   string | null;
          title:      string;
          body:       string | null;
          link:       string | null;
          metadata:   Json;
          priority:   NotificationPriority;
          is_read:    boolean;
          read_at:    string | null;
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
          user_id:           string;
          email_enabled:     boolean;
          sms_enabled:       boolean;
          push_enabled:      boolean;
          in_app_enabled:    boolean;
          booking_updates:   boolean;
          payment_updates:   boolean;
          review_requests:   boolean;
          admin_alerts:      boolean;
          quiet_hours_start: string | null;
          quiet_hours_end:   string | null;
          timezone:          string;
          created_at:        string;
          updated_at:        string;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_preferences"]["Row"], "created_at" | "updated_at"> & {
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
        Update: Partial<Omit<Database["public"]["Tables"]["notification_preferences"]["Insert"], "user_id">>;
      };

      push_subscriptions: {
        Row: {
          id:          string;
          user_id:     string;
          endpoint:    string;
          p256dh:      string;
          auth:        string;
          user_agent:  string | null;
          disabled_at: string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
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
          id:                  string;
          notification_id:     string;
          user_id:             string;
          channel:             NotificationChannel;
          status:              NotificationDeliveryStatus;
          provider:            string | null;
          provider_message_id: string | null;
          error_message:       string | null;
          attempt_count:       number;
          next_attempt_at:     string | null;
          attempted_at:        string | null;
          sent_at:             string | null;
          created_at:          string;
          updated_at:          string;
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
          name:       string;
          value:      string;
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
          id:          string;
          actor_id:    string | null;
          action:      string;
          entity_type: string;
          entity_id:   string | null;
          metadata:    Json | null;
          created_at:  string;
        };
        Insert: never; // written via log_audit() SECURITY DEFINER function only
        Update: never;
      };
    };

    // ── Views ──────────────────────────────────────────────
    Views: {
      mv_venue_monthly_stats: {
        Row: {
          venue_id:      string;
          month:         string;
          booking_count: number;
          revenue:       number | null;
          commission:    number | null;
          avg_rating:    number | null;
          review_count:  number;
        };
      };
    };

    // ── Functions ──────────────────────────────────────────
    Functions: {
      has_role:  { Args: { p_role: UserRole }; Returns: boolean };
      is_admin:  { Returns: boolean };
      owns_venue: { Args: { p_venue_id: string }; Returns: boolean };
      is_org_member_for_venue: { Args: { p_venue_id: string }; Returns: boolean };
      is_booking_customer: { Args: { p_booking_id: string }; Returns: boolean };
      owns_booking_venue:  { Args: { p_booking_id: string }; Returns: boolean };

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
          query_embedding:  number[];
          match_threshold?: number;
          match_count?:     number;
          filter_province?: string;
          filter_city?:     string;
          filter_capacity?: number;
          filter_max_price?: number;
        };
        Returns: Array<{
          id: string; name: string; slug: string; city: string;
          base_price: number; avg_rating: number; similarity: number;
        }>;
      };
      log_audit: {
        Args: { p_action: string; p_entity_type: string; p_entity_id?: string; p_metadata?: Json };
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
        Args: { p_venue_id: string; p_from?: string; p_to?: string; p_granularity?: string };
        Returns: Array<{ period: string; booking_count: number; revenue: number; commission: number; avg_rating: number }>;
      };
    };

    // ── Enums ──────────────────────────────────────────────
    Enums: {
      user_role:             UserRole;
      org_member_role:       OrgMemberRole;
      account_status:        AccountStatus;
      venue_status:          VenueStatus;
      price_unit:            PriceUnit;
      indoor_outdoor:        IndoorOutdoor;
      media_type:            MediaType;
      availability_status:   AvailabilityStatus;
      booking_status:        BookingStatus;
      inquiry_status:        InquiryStatus;
      accreditation_status:  AccreditationStatus;
      review_status:         ReviewStatus;
      payment_provider:      PaymentProvider;
      transaction_status:    TransactionStatus;
      refund_status:         RefundStatus;
      invoice_status:        InvoiceStatus;
      verification_type:     VerificationType;
      verification_status:   VerificationStatus;
      notification_kind:     NotificationKind;
      notification_channel:  NotificationChannel;
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
