"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DashButton } from "./ui";
import { MaterialIcon } from "./MaterialIcon";
import { respondToInvitationAction } from "../../../../app/(venue-owner)/dashboard/coordinator/actions";
import { toast } from "sonner";

export type CoordinatorInvitationRow = {
  id: string;
  organizationName: string;
  date: string;
};

export function CoordinatorInvitations({
  invitations,
}: {
  invitations: CoordinatorInvitationRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!invitations || invitations.length === 0) return null;

  const handleRespond = (invitationId: string, accept: boolean) => {
    startTransition(async () => {
      try {
        const result = await respondToInvitationAction({
          invitationId,
          accept,
        });
        if (result.error) {
          toast.error(result.error.message);
          return;
        }

        toast.success(accept ? "Invitation accepted!" : "Invitation declined.");
        router.refresh();
      } catch (error) {
        toast.error("Failed to respond to the invitation. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <MaterialIcon name="mail" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">
                Invitation from {inv.organizationName}
              </p>
              <p className="text-sm text-blue-700">
                You have been invited to manage venues for this organization.
                Sent on {inv.date}.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <DashButton
              variant="danger"
              disabled={isPending}
              onClick={() => handleRespond(inv.id, false)}
            >
              Decline
            </DashButton>
            <DashButton
              disabled={isPending}
              onClick={() => handleRespond(inv.id, true)}
            >
              Accept
            </DashButton>
          </div>
        </div>
      ))}
    </div>
  );
}
