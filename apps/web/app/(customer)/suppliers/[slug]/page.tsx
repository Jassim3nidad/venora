import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerBookingsForContact } from "@/features/suppliers/application/get-customer-bookings-for-contact";
import { isSupplierFavoritedByUser } from "@/features/suppliers/application/get-favorite-suppliers";
import { getPublicSupplierBySlug } from "@/features/suppliers/application/queries";
import { SupplierDetail } from "@/features/suppliers/ui/SupplierDetail";
import { absoluteUrl } from "@/src/lib/site-url";

type SupplierDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SupplierDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const supplier = await getPublicSupplierBySlug(supabase, slug);

  if (!supplier) {
    return {
      title: "Supplier Not Found - Venora",
    };
  }

  const description =
    supplier.headline ??
    supplier.description ??
    "Accredited Venora supplier profile.";
  const ogImage =
    supplier.heroImageUrl ?? supplier.profileImageUrl ?? undefined;

  return {
    title: `${supplier.businessName} - Supplier Profile`,
    description,
    alternates: { canonical: `/suppliers/${slug}` },
    openGraph: {
      title: supplier.businessName,
      description,
      type: "profile",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: supplier.businessName,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

function buildSupplierJsonLd(
  supplier: Awaited<ReturnType<typeof getPublicSupplierBySlug>>,
  canonicalUrl: string,
) {
  if (!supplier) return null;
  const image = supplier.heroImageUrl ?? supplier.profileImageUrl ?? undefined;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: supplier.businessName,
    description: supplier.headline ?? supplier.description ?? undefined,
    url: canonicalUrl,
    ...(image ? { image: [image] } : {}),
    ...(supplier.websiteUrl ? { sameAs: [supplier.websiteUrl] } : {}),
    ...(supplier.serviceAreas.length > 0
      ? { areaServed: supplier.serviceAreas }
      : {}),
  };

  if (supplier.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: supplier.avgRating,
      reviewCount: supplier.reviewCount,
    };
  }

  return jsonLd;
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const supplier = await getPublicSupplierBySlug(supabase, slug);

  if (!supplier) notFound();

  const [bookings, isFavorited] = user
    ? await Promise.all([
        getCustomerBookingsForContact(user.id),
        isSupplierFavoritedByUser(supabase, user.id, supplier.id),
      ])
    : [[], false];

  const jsonLd = buildSupplierJsonLd(
    supplier,
    absoluteUrl(`/suppliers/${slug}`),
  );

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <SupplierDetail
        supplier={supplier}
        currentUser={user}
        bookings={bookings}
        isFavorited={isFavorited}
      />
    </>
  );
}
