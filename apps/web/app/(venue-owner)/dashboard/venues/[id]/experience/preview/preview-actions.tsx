"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { DashButton } from "@/components/dashboard/enterprise";
import { publishStructuredVenueProfileAction } from "@/src/features/venues/application/structured-profile-actions";

type Props = {
  venueId: string;
  revisionId: string;
  disabled: boolean;
};

export function StructuredPreviewActions({
  venueId,
  revisionId,
  disabled,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <DashButton
        href={`/dashboard/venues/${venueId}/experience`}
        variant="secondary"
        icon="arrow_back"
      >
        Back to Editor
      </DashButton>
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          if (!window.confirm("Publish this structured venue profile?")) return;
          startTransition(async () => {
            const result = await publishStructuredVenueProfileAction({
              venueId,
              revisionId,
            });
            if (result.error) {
              window.alert(result.error.message);
              return;
            }
            router.push(`/dashboard/venues/${venueId}/experience`);
            router.refresh();
          });
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {isPending ? "Publishing..." : "Publish Draft"}
      </button>
    </div>
  );
}
