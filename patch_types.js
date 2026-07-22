const fs = require('fs');

const path = 'packages/database/types/generated.ts';
let code = fs.readFileSync(path, 'utf-8');

const newEnums = `
      business_visibility_level:
        | "exact"
        | "city_province"
        | "province"
        | "hidden";
      business_publication_status:
        | "incomplete"
        | "draft"
        | "published"
        | "changes_pending"
        | "suspended";
`;

const newTables = `
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
`;

code = code.replace(/Enums:\s*\{/, 'Enums: {' + newEnums);
code = code.replace(/Tables:\s*\{/, 'Tables: {' + newTables);

fs.writeFileSync(path, code);
console.log("Patched generated.ts successfully.");
