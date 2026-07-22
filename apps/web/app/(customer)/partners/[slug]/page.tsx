import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessProfileRepository } from "@/src/features/business-profiles/data/business-profile.repository";
import { BusinessProfileView } from "@/src/features/business-profiles/ui/BusinessProfileView";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const repo = new BusinessProfileRepository(supabase as any);
  const profile = await repo.getPublishedProfileBySlug(slug);

  if (!profile) {
    return {
      title: "Partner Not Found - Venora",
      description: "This Venora partner profile could not be found.",
    };
  }

  return {
    title: `${profile.displayName} - Venora Partner`,
    description: profile.shortDescription || profile.tagline || `View venues and portfolio for ${profile.displayName} on Venora.`,
    alternates: { canonical: `/partners/${profile.slug}` },
  };
}

export default async function PartnerProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const repo = new BusinessProfileRepository(supabase as any);
  
  const profile = await repo.getPublishedProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  return <BusinessProfileView profile={profile} />;
}
