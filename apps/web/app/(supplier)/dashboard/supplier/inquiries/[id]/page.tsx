import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  DashButton,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { getOwnedSupplierInquiry } from "@/features/suppliers/application/dashboard-queries";
import { getRequiredSupplierDashboardContext } from "../../_lib/supplier-dashboard-data";
import { InquiryMessageThread } from "../../_components/inquiry-message-thread";

export const dynamic = "force-dynamic";

function value(value: unknown) {
  return value == null || value === "" ? "Not provided" : String(value);
}

export default async function SupplierInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile, user } = await getRequiredSupplierDashboardContext();
  if (!profile) notFound();
  const inquiry = await getOwnedSupplierInquiry(supabase, profile.id, id);
  if (!inquiry) notFound();

  const [{ data: messages }, { data: quote }] = await Promise.all([
    (supabase as any)
      .from("supplier_inquiry_messages")
      .select("id, sender_id, message, created_at")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
    (supabase as any)
      .from("supplier_quotes")
      .select("id, status, total")
      .eq("inquiry_id", id)
      .maybeSingle(),
  ]);

  const service = inquiry.supplier_services as { name?: string } | null;
  return (
    <DashboardSubPage
      title={inquiry.contact_name}
      description="Review the event request, discuss details, and prepare a quote."
      action={<StatusBadge status={inquiry.status} />}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Event & Service Details" />
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Service", service?.name ?? "General inquiry"],
                ["Event date", inquiry.event_date_snapshot ?? inquiry.event_date],
                ["Start time", inquiry.event_start_time_snapshot],
                ["Venue", inquiry.venue_name_snapshot],
                ["Location", inquiry.location_snapshot ?? inquiry.event_location],
                ["Guest count", inquiry.guest_count_snapshot ?? inquiry.guest_count],
              ].map(([label, content]) => (
                <div key={String(label)} className="rounded-2xl bg-[#f8fafc] p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#64748b]">{label}</dt>
                  <dd className="mt-1 font-semibold text-[#0f172a]">{value(content)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Customer Message" />
            <p className="whitespace-pre-wrap text-sm leading-7 text-[#334155]">{inquiry.message}</p>
          </Panel>
          <Panel>
            <PanelHeader title="Conversation" description="Messages are visible only to you and this customer." />
            <InquiryMessageThread 
              inquiryId={id} 
              messages={messages ?? []} 
              supplierUserId={user.id} 
              customerName={inquiry.contact_name}
              supplierName={profile.businessName}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Customer" />
            <div className="space-y-2 text-sm text-[#475569]">
              <p className="font-bold text-[#0f172a]">{inquiry.contact_name}</p>
              <p>{inquiry.contact_email}</p>
              <p>{value(inquiry.contact_phone)}</p>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Service Proposal" />
            {quote ? (
              <div className="space-y-4">
                <StatusBadge status={quote.status} />
                <p className="text-2xl font-black text-[#0f172a]">₱{Number(quote.total).toLocaleString("en-PH")}</p>
                <DashButton href={`/dashboard/supplier/quotes/${quote.id}`} variant="secondary">View proposal</DashButton>
              </div>
            ) : (
              <DashButton href={`/dashboard/supplier/quotes/new?inquiryId=${id}`} icon="request_quote">Create service proposal</DashButton>
            )}
          </Panel>
        </div>
      </div>
    </DashboardSubPage>
  );
}
