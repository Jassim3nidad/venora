import {
  DashboardPage,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function DisputeDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermissionOrRedirect("reports.view");

  const supabase = (await createClient()) as any;
  const { data: dispute, error } = await supabase
    .from("disputes")
    .select(
      "*, profiles!raised_by(full_name, email), venues(name), bookings(total_price, start_time, status)",
    )
    .eq("id", params.id)
    .single();

  if (error || !dispute) {
    redirect("/admin/disputes");
  }

  async function resolveDispute(formData: FormData) {
    "use server";
    const notes = formData.get("resolution_notes") as string;
    const client = (await createClient()) as any;

    await client.rpc("resolve_dispute", {
      p_dispute_id: dispute.id,
      p_resolution_notes: notes,
    });

    revalidatePath(`/admin/disputes/${dispute.id}`);
    revalidatePath("/admin/disputes");
  }

  return (
    <DashboardPage>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">Dispute Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader title="General Information" />
          <div className="p-6 space-y-4">
            <div>
              <span className="text-sm text-slate-500 block">Status</span>
              <StatusBadge status={dispute.status} />
            </div>
            <div>
              <span className="text-sm text-slate-500 block">Raised By</span>
              <span className="font-medium text-slate-900">
                {dispute.profiles?.full_name} ({dispute.profiles?.email})
              </span>
            </div>
            <div>
              <span className="text-sm text-slate-500 block">Venue</span>
              <span className="font-medium text-slate-900">
                {dispute.venues?.name}
              </span>
            </div>
            <div>
              <span className="text-sm text-slate-500 block">Reason</span>
              <p className="text-slate-900">{dispute.reason}</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Booking & Payment" />
          <div className="p-6 space-y-4">
            <div>
              <span className="text-sm text-slate-500 block">Booking ID</span>
              <span className="font-medium text-slate-900">
                {dispute.booking_id}
              </span>
            </div>
            {dispute.bookings && (
              <>
                <div>
                  <span className="text-sm text-slate-500 block">
                    Booking Amount
                  </span>
                  <span className="font-medium text-slate-900">
                    ₱{dispute.bookings.total_price.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-slate-500 block">
                    Booking Status
                  </span>
                  <StatusBadge status={dispute.bookings.status} />
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="md:col-span-2">
          <PanelHeader title="Resolution" />
          <div className="p-6">
            {dispute.status === "resolved" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500 block">
                    Resolved At
                  </span>
                  <span className="font-medium text-slate-900">
                    {new Date(dispute.resolved_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-slate-500 block">
                    Resolution Notes
                  </span>
                  <p className="text-slate-900">{dispute.resolution_notes}</p>
                </div>
              </div>
            ) : (
              <form action={resolveDispute} className="space-y-4">
                <div>
                  <label
                    htmlFor="resolution_notes"
                    className="text-sm text-slate-500 block mb-2"
                  >
                    Resolution Notes
                  </label>
                  <textarea
                    id="resolution_notes"
                    name="resolution_notes"
                    required
                    className="w-full border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                    rows={4}
                    placeholder="Describe how this dispute was resolved..."
                  />
                </div>
                <button
                  type="submit"
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  Mark as Resolved
                </button>
              </form>
            )}
          </div>
        </Panel>
      </div>
    </DashboardPage>
  );
}
