"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { UnauthorizedError } from "@/src/lib/errors";
import { BusinessProfileRepository } from "../data/business-profile.repository";
import { calculateProfileCompleteness } from "./completeness";
import {
  businessIdentitySchema,
  businessAboutSchema,
  businessContactSchema,
} from "../schemas/business-profile.schema";

const profileIdSchema = z.object({ profileId: z.string().uuid() });

export async function saveBusinessIdentity(rawInput: unknown) {
  return createServerAction(
    profileIdSchema.merge(businessIdentitySchema),
    async (input) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();

      const repo = new BusinessProfileRepository(supabase as any);
      await repo.updateDraft(input.profileId, {
        display_name: input.display_name,
        slug: input.slug,
        legal_name: input.legal_name,
        tagline: input.tagline,
        primary_category: input.primary_category,
        year_established: input.year_established,
        logo_path: input.logo_path,
        cover_image_path: input.cover_image_path,
        updated_at: new Date().toISOString(),
      });

      revalidatePath("/dashboard/business-profile");
      return { success: true };
    },
    rawInput
  );
}

export async function saveBusinessAbout(rawInput: unknown) {
  return createServerAction(
    profileIdSchema.merge(businessAboutSchema),
    async (input) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();

      const repo = new BusinessProfileRepository(supabase as any);
      await repo.updateDraft(input.profileId, {
        short_description: input.short_description,
        about: input.about,
        updated_at: new Date().toISOString(),
      });

      revalidatePath("/dashboard/business-profile");
      return { success: true };
    },
    rawInput
  );
}

export async function saveBusinessContact(rawInput: unknown) {
  return createServerAction(
    profileIdSchema.merge(businessContactSchema),
    async (input) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();

      const repo = new BusinessProfileRepository(supabase as any);
      await repo.updateDraft(input.profileId, {
        city: input.city,
        province: input.province,
        country_code: input.country_code,
        private_address: input.private_address,
        address_visibility: input.address_visibility,
        public_email: input.public_email,
        email_visibility: input.email_visibility,
        public_phone: input.public_phone,
        phone_visibility: input.phone_visibility,
        website_url: input.website_url,
        updated_at: new Date().toISOString(),
      });

      revalidatePath("/dashboard/business-profile");
      return { success: true };
    },
    rawInput
  );
}

export async function publishBusinessProfile(rawInput: unknown) {
  return createServerAction(
    profileIdSchema.extend({ organizationId: z.string().uuid() }),
    async (input) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();

      const repo = new BusinessProfileRepository(supabase as any);
      const draft = await repo.getDraftByOrganization(input.organizationId);
      if (!draft) throw new Error("Draft not found");

      const completeness = calculateProfileCompleteness(draft);
      if (!completeness.isEligibleForPublish) {
        throw new Error(`Profile is not eligible for publishing. Missing: ${completeness.missingItems.join(", ")}`);
      }

      // Build the sanitized snapshot
      const snapshot = {
        id: draft.id,
        slug: draft.slug,
        displayName: draft.display_name,
        tagline: draft.tagline,
        shortDescription: draft.short_description,
        about: draft.about,
        primaryCategory: draft.primary_category,
        yearEstablished: draft.year_established,
        logoPath: draft.logo_path,
        coverImagePath: draft.cover_image_path,
        city: draft.address_visibility !== "hidden" ? draft.city : null,
        province: draft.address_visibility !== "hidden" ? draft.province : null,
        countryCode: draft.address_visibility !== "hidden" ? draft.country_code : null,
        publicEmail: draft.email_visibility ? draft.public_email : null,
        publicPhone: draft.phone_visibility ? draft.public_phone : null,
        websiteUrl: draft.website_url,
        verificationStatus: draft.verification_status,
        venues: (draft.venues || []).filter(v => v.is_visible).sort((a, b) => a.display_order - b.display_order),
        portfolio: (draft.portfolio || []).filter(p => p.is_visible).sort((a, b) => a.display_order - b.display_order),
        team: (draft.team || []).filter(t => t.is_visible).sort((a, b) => a.display_order - b.display_order),
        socialLinks: (draft.social_links || []).filter(s => s.is_visible).sort((a, b) => a.display_order - b.display_order),
        policies: (draft.policies || []).filter(p => p.is_visible).sort((a, b) => a.display_order - b.display_order),
      };

      // Calculate next version
      const { count, error: countError } = await supabase
        .from("business_profile_publications")
        .select("*", { count: "exact", head: true })
        .eq("business_profile_id", input.profileId);
        
      if (countError) throw countError;
      const versionNumber = (count || 0) + 1;

      // Create publication record
      const publicationId = await repo.createPublication(
        input.profileId,
        snapshot,
        user.id,
        versionNumber
      );

      // Update draft to published
      await repo.updateDraft(input.profileId, {
        publication_status: "published",
        current_publication_id: publicationId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Write audit log
      await (supabase as any).from("audit_logs").insert({
        actor_id: user.id,
        action: "business_profile_published",
        entity_type: "business_profile",
        entity_id: input.profileId,
        metadata: { version: versionNumber }
      });

      revalidatePath("/dashboard/business-profile");
      revalidatePath(`/partners/${draft.slug}`);
      
      return { success: true };
    },
    rawInput
  );
}
