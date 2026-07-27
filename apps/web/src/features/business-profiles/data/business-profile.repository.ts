import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@venora/database/types/generated";
import type {
  BusinessProfileDraft,
  BusinessProfilePublicView,
} from "../types/business-profile.types";

export class BusinessProfileRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getDraftByOrganization(
    organizationId: string,
  ): Promise<BusinessProfileDraft | null> {
    const { data: profile, error } = await (this.supabase as any)
      .from("business_profiles")
      .select(
        `*,
        venues:business_profile_venues(*),
        portfolio:business_portfolio_items(*),
        team:business_team_members(*),
        social_links:business_social_links(*),
        policies:business_profile_policies(*)`,
      )
      .eq("organization_id", organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const { data: ownedVenues, error: venuesError } = await (
      this.supabase as any
    )
      .from("venues")
      .select("id, name, slug")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (venuesError) throw venuesError;

    return {
      ...profile,
      published_venues: ownedVenues ?? [],
    } as unknown as BusinessProfileDraft;
  }

  async getPublishedProfileBySlug(
    slug: string,
  ): Promise<BusinessProfilePublicView | null> {
    // Read the business profile to find the current publication ID
    const { data: profile, error: profileError } = await (this.supabase as any)
      .from("business_profiles")
      .select("current_publication_id")
      .eq("slug", slug)
      .eq("publication_status", "published")
      .single();

    if (profileError || !profile || !profile.current_publication_id) {
      return null;
    }

    const { data: publication, error: pubError } = await (this.supabase as any)
      .from("business_profile_publications")
      .select("snapshot")
      .eq("id", profile.current_publication_id)
      .single();

    if (pubError || !publication) {
      return null;
    }

    return publication.snapshot as unknown as BusinessProfilePublicView;
  }

  async updateDraft(id: string, updates: any): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("business_profiles")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  }

  async createPublication(
    profileId: string,
    snapshot: any,
    userId: string,
    versionNumber: number,
  ): Promise<string> {
    const { data, error } = await (this.supabase as any)
      .from("business_profile_publications")
      .insert({
        business_profile_id: profileId,
        version_number: versionNumber,
        snapshot,
        created_by: userId,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }
}
