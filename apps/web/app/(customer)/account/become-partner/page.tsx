import { Metadata } from "next";
import { PartnerWizard } from "@/features/partner-applications/ui/PartnerWizard";

export const metadata: Metadata = {
  title: "Become a Partner",
};

export default function BecomePartnerPage() {
  return (
    <div className="rounded-[24px] border border-[#E5E7EB]/80 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-10">
      <PartnerWizard />
    </div>
  );
}
