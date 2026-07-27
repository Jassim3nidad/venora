"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishBusinessProfile } from "@/src/features/business-profiles/application/actions";

export function PublishButton({
  profileId,
  organizationId,
}: {
  profileId: string;
  organizationId: string;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();

  const handlePublish = async () => {
    setIsPublishing(true);
    const res = await publishBusinessProfile({ profileId, organizationId });
    setIsPublishing(false);

    if (res.error) {
      alert("Error publishing profile: " + res.error.message);
    } else {
      alert("Profile published successfully!");
      router.refresh();
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={isPublishing}
      className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {isPublishing ? "Publishing..." : "Publish Profile"}
    </button>
  );
}
