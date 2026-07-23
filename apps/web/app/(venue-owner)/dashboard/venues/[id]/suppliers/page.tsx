import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Handshake, ExternalLink } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { DashboardSubPage, Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { RemoveSupplierButton } from "./RemoveSupplierButton";

export const metadata: Metadata = {
  title: "Accredited Suppliers - Venue Dashboard",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

type SupplierLink = {
  supplier_id: string;
  is_preferred: boolean;
  supplier_profiles: {
    id: string;
    business_name: string;
    description: string | null;
    avg_rating: number;
    review_count: number;
    slug: string | null;
    supplier_categories: { name: string } | null;
  } | null;
};

export default async function VenueSuppliersPage({ params }: Props) {
  const { id: venueId } = await params;
  const supabase = (await createClient()) as any;

  const { data: venueData } = await supabase
    .from("venues")
    .select("id, name, slug, organization_id")
    .eq("id", venueId)
    .single();

  if (!venueData) notFound();

  const venue = venueData as {
    id: string;
    name: string;
    slug: string | null;
    organization_id: string;
  };

  const { data: associations, error } = await supabase
    .from("venue_suppliers")
    .select(
      `
      supplier_id,
      is_preferred,
      supplier_profiles (
        id,
        business_name,
        description,
        avg_rating,
        review_count,
        slug,
        supplier_categories ( name )
      )
    `,
    )
    .eq("venue_id", venueId)
    .order("is_preferred", { ascending: false });

  if (error) {
    console.error("[venue-suppliers] fetch error:", error.message);
  }

  const links = ((associations ?? []) as SupplierLink[]).filter(
    (l) => l.supplier_profiles != null,
  );

  return (
    <DashboardSubPage
      title={`Venue Partners — ${venue.name}`}
      description="Accredited suppliers linked to this venue. Partners appear as recommended suppliers to clients during event planning."
      action={
        <Link
          href={`/dashboard/coordinator/suppliers`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
        >
          <Handshake className="h-4 w-4" />
          Browse &amp; Invite Suppliers
        </Link>
      }
    >
      <div className="mb-6">
        <Link
          href={`/dashboard/venues/${venue.id}/edit`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Venue Edit
        </Link>
      </div>

      <Panel>
        <PanelHeader
          title="Linked Suppliers"
          description="Preferred partners are highlighted and appear first in client recommendations."
        />
        {links.length === 0 ? (
          <div className="py-14 text-center">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-sm text-slate-700">No suppliers linked yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Browse the supplier directory and click &ldquo;Invite as Venue Partner&rdquo; to
              start building your preferred supplier list.
            </p>
            <Link
              href="/dashboard/coordinator/suppliers"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
            >
              <Handshake className="w-4 h-4" />
              Browse Accredited Suppliers
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {links.map((link) => {
              const sp = link.supplier_profiles!;
              return (
                <div
                  key={link.supplier_id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {sp.business_name}
                        </p>
                        {link.is_preferred && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Preferred
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">
                        {sp.supplier_categories?.name ?? "Service Provider"}
                        {sp.review_count > 0
                          ? ` · ★ ${Number(sp.avg_rating).toFixed(1)} (${sp.review_count})`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sp.slug && (
                      <Link
                        href={`/suppliers/${sp.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Profile
                      </Link>
                    )}
                    <RemoveSupplierButton
                      supplierId={link.supplier_id}
                      venueId={venueId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </DashboardSubPage>
  );
}
