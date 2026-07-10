import { Metadata } from "next";
import { getLatestPartnerApplicationForUser } from "@/features/partner-applications/application/get-partner-application-for-user";
import { PartnerApplicationProgress } from "@/features/partner-applications/ui/PartnerApplicationProgress";
import { PartnerWizard } from "@/features/partner-applications/ui/PartnerWizard";

export const metadata: Metadata = {
  title: "Become a Partner",
};

const cardClassName =
  "rounded-[24px] border border-[#E5E7EB]/80 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-10";

export default async function BecomePartnerPage() {
  const application = await getLatestPartnerApplicationForUser();
  const showWizard = !application || application.status === "denied";

  return (
    <div className="flex flex-col gap-6">
      {application ? (
        <section className={cardClassName} aria-label="Application status">
          <PartnerApplicationProgress application={application} />
        </section>
      ) : null}

      {showWizard ? (
        <section className={cardClassName} aria-label="Partner application setup">
          {application?.status === "denied" ? (
            <header className="mb-8 border-b border-[#E5E7EB]/80 pb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Application Setup
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                Submit a new application
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Complete the steps below to apply again as a venue owner, event
                coordinator, or supplier.
              </p>
            </header>
          ) : null}

          <PartnerWizard />
        </section>
      ) : null}
    </div>
  );
}
