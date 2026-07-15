"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuidanceModal } from "./GuidanceModal";
import { RoleSelection } from "./RoleSelection";
import { CategorySelection } from "./CategorySelection";
import { AddressConfirmation } from "./AddressConfirmation";
import { VerificationUpload } from "./VerificationUpload";
import { submitPartnerApplicationAction } from "../actions/partner.actions";
import { PartnerApplicationInput } from "../schemas/partner.schema";
import { Loader2 } from "lucide-react";

type Step = "guidance" | "role" | "category" | "address" | "documents";

export function PartnerWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("guidance");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<PartnerApplicationInput>>(
    {},
  );

  const handleNext = (
    data: Partial<PartnerApplicationInput>,
    nextStep: Step,
  ) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (docs: string[]) => {
    setIsSubmitting(true);
    setError(null);

    const finalData = { ...formData, documents: docs };

    // We expect finalData to be fully populated now
    const response = await submitPartnerApplicationAction(finalData);

    if (response.success) {
      router.refresh();
    } else {
      setError(response.error || "An unknown error occurred.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-3xl font-sans">
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {step === "guidance" && (
        <GuidanceModal
          onStart={() => setStep("role")}
          onHelp={() => (window.location.href = "mailto:support@venora.com")}
        />
      )}

      {step === "role" && (
        <RoleSelection
          onNext={(role) =>
            handleNext({ roleAppliedFor: role as any }, "category")
          }
        />
      )}

      {step === "category" && formData.roleAppliedFor && (
        <CategorySelection
          role={formData.roleAppliedFor}
          onNext={(cat) => handleNext({ category: cat }, "address")}
          onBack={() => setStep("role")}
        />
      )}

      {step === "address" && (
        <AddressConfirmation
          onNext={(addr) => handleNext({ address: addr }, "documents")}
          onBack={() => setStep("category")}
        />
      )}

      {step === "documents" && formData.roleAppliedFor && (
        <VerificationUpload
          role={formData.roleAppliedFor}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onBack={() => setStep("address")}
        />
      )}
    </div>
  );
}
