import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { DashboardSubPage, Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { ArrowLeft, Users, Building, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Accredited Suppliers - Venue Dashboard",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueSuppliersPage({ params }: Props) {
  const { id: venueId } = await params;
  const supabase = await createClient();

  const { data: venueData } = await supabase
    .from("venues")
    .select("id, name, slug, organization_id")
    .eq("id", venueId)
    .single();

  const venue = venueData as { id: string; name: string; slug: string | null; organization_id: string } | null;

  if (!venue) {
    notFound();
  }

  const { data: associations } = await supabase
    .from("venue_suppliers")
    .select(`
      id,
      status,
      created_at,
      suppliers (
        id,
        name,
        slug,
        category,
        rating,
        city
      )
    `)
    .eq("venue_id", venueId);

  return (
    <DashboardSubPage
      title={`Accredited Suppliers — ${venue.name}`}
      description="Manage preferred caterers, decorators, lights & sound, and event services accredited for this venue."
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
          title="Associated Suppliers"
          description="Accredited suppliers can be recommended directly to clients during event planning."
        />
        {(!associations || associations.length === 0) ? (
          <div className="py-12 text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-700">No accredited suppliers linked yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Link accredited suppliers to provide exclusive packages and streamlined event coordination.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {associations.map((assoc: any) => (
              <div key={assoc.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{assoc.suppliers?.name || "Supplier"}</p>
                  <p className="text-xs text-slate-500 capitalize">{assoc.suppliers?.category || "Service Provider"}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 capitalize">
                  {assoc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardSubPage>
  );
}
