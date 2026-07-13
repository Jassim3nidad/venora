import Link from "next/link";
import { Mail, Store, TicketCheck, CalendarDays, MapPin } from "lucide-react";
import {
  CustomerEmptyState,
  CustomerLinkButton,
  CustomerPageHeader,
} from "@/src/components/customer/CustomerUI";

type CustomerInquiryListProps = {
  inquiries: any[];
};

export function CustomerInquiryList({ inquiries }: CustomerInquiryListProps) {
  if (inquiries.length === 0) {
    return (
      <CustomerEmptyState
        icon={Mail}
        eyebrow="No supplier inquiries"
        title="Start browsing suppliers."
        description="Find trusted suppliers, compare packages, and send inquiries directly from their profiles."
        action={
          <CustomerLinkButton href="/suppliers">
            Browse Suppliers
          </CustomerLinkButton>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      {inquiries.map((inquiry) => {
        const supplier = inquiry.supplier_profiles;
        const service = inquiry.supplier_services;
        const supplierImage = supplier?.profile_image_url || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80";
        
        return (
          <article
            key={inquiry.id}
            className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70"
          >
            <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="relative h-56 overflow-hidden bg-[#EFF6FF] lg:h-full">
                <img
                  src={supplierImage}
                  alt={supplier?.business_name ?? "Supplier"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent lg:bg-gradient-to-r" />
              </div>

              <div className="grid gap-5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                      {inquiry.status}
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                      {supplier?.business_name ?? "Supplier"}
                    </h2>
                    {service?.name ? (
                      <p className="mt-1 text-sm font-bold text-[#6B7280]">
                        Package: {service.name}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm font-bold text-[#6B7280]">
                        General inquiry
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#6B7280]">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#2563EB]" />
                        {inquiry.location_snapshot || inquiry.venue_name_snapshot || inquiry.event_location || "Location unavailable"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                        {inquiry.event_date_snapshot || inquiry.event_date || "Date not set"}
                      </span>
                      {inquiry.guest_count_snapshot || inquiry.guest_count ? (
                        <span className="inline-flex items-center gap-2">
                          <TicketCheck className="h-4 w-4 text-[#2563EB]" />
                          {(inquiry.guest_count_snapshot || inquiry.guest_count).toLocaleString("en-PH")} guests
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <CustomerLinkButton href={`/account/inquiries/${inquiry.id}`} tone="primary">
                    View Inquiry
                  </CustomerLinkButton>
                  
                  {supplier?.slug ? (
                    <Link
                      href={`/suppliers/${supplier.slug}`}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                    >
                      <Store className="mr-2 h-4 w-4" />
                      View Profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
