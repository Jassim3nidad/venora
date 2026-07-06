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
import { CheckCircle2, Loader2 } from "lucide-react";

type Step = 
  | "guidance" 
  | "role" 
  | "category" 
  | "address" 
  | "documents" 
  | "success";

export function PartnerWizard() {
  const router = useRouter();
  
  const [step, setStep] = useState<Step>("guidance");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<PartnerApplicationInput>>({});

  const handleNext = (data: Partial<PartnerApplicationInput>, nextStep: Step) => {
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
      setStep("success");
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
          onHelp={() => window.location.href = "mailto:support@venora.com"} 
        />
      )}

      {step === "role" && (
        <RoleSelection 
          onNext={(role) => handleNext({ roleAppliedFor: role as any }, "category")} 
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

      {step === "success" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-4">
            Application Submitted
          </h2>
          <p className="text-slate-500 mb-8 max-w-md">
            We have received your application. Our Admin team will review your verification documents and business address. You will receive an email once approved!
          </p>
          <button
            onClick={() => router.push("/account")}
            className="rounded-full bg-[#2563EB] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
