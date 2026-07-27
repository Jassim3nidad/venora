import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicOwnerProfile } from "@/src/features/owners/application/queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const profile = await getPublicOwnerProfile(supabase, slug);

  if (!profile) {
    return {
      title: "Partner Not Found - Venora",
      description: "This Venora partner profile could not be found.",
    };
  }

  return {
    title: `${profile.name} - Venue Owner on Venora`,
    description:
      profile.shortDescription ||
      profile.tagline ||
      `View venues and reviews for ${profile.name} on Venora.`,
    alternates: { canonical: `/owners/${profile.slug}` },
  };
}

export default async function PartnerProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const profile = await getPublicOwnerProfile(supabase, slug);

  if (!profile) {
    notFound();
  }

  redirect(`/owners/${profile.slug}`);
}
