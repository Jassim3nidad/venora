import { ROLE_LABELS, type RoleName } from "@/lib/rbac/roles";

export type PartnerApplicationStatus = "pending" | "approved" | "denied";

export type PartnerApplicationRole = Extract<
  RoleName,
  "venue_owner" | "event_coordinator" | "supplier"
>;

export type UserPartnerApplication = {
  id: string;
  status: PartnerApplicationStatus;
  role_applied_for: PartnerApplicationRole;
  category: string;
  denial_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const PARTNER_DASHBOARD_ROUTES: Record<PartnerApplicationRole, string> = {
  venue_owner: "/dashboard/venue-owner",
  event_coordinator: "/dashboard/coordinator",
  supplier: "/dashboard/supplier",
};

export function getPartnerRoleLabel(role: PartnerApplicationRole) {
  return ROLE_LABELS[role];
}

export type ProgressStepState = "complete" | "current" | "upcoming" | "declined" | "skipped";

export type PartnerApplicationProgressStep = {
  id: string;
  label: string;
  description: string;
  state: ProgressStepState;
};

export function getPartnerApplicationProgressSteps(
  application: UserPartnerApplication,
): PartnerApplicationProgressStep[] {
  const roleLabel = getPartnerRoleLabel(application.role_applied_for);

  if (application.status === "pending") {
    return [
      {
        id: "submitted",
        label: "Application Submitted",
        description: `Your ${roleLabel} application has been received.`,
        state: "complete",
      },
      {
        id: "review",
        label: "Under Review",
        description: "Our team is reviewing your documents and business details.",
        state: "current",
      },
      {
        id: "decision",
        label: "Decision",
        description: "You'll be notified when your application is approved or declined.",
        state: "upcoming",
      },
      {
        id: "workspace",
        label: "Workspace Active",
        description: "Access your partner dashboard after approval.",
        state: "upcoming",
      },
    ];
  }

  if (application.status === "approved") {
    return [
      {
        id: "submitted",
        label: "Application Submitted",
        description: `Your ${roleLabel} application was submitted successfully.`,
        state: "complete",
      },
      {
        id: "review",
        label: "Under Review",
        description: "Your documents and business details were reviewed.",
        state: "complete",
      },
      {
        id: "decision",
        label: "Approved",
        description: "Your application was approved.",
        state: "complete",
      },
      {
        id: "workspace",
        label: "Workspace Active",
        description: "Your partner workspace is ready to use.",
        state: "complete",
      },
    ];
  }

  return [
    {
      id: "submitted",
      label: "Application Submitted",
      description: `Your ${roleLabel} application was submitted successfully.`,
      state: "complete",
    },
    {
      id: "review",
      label: "Under Review",
      description: "Your documents and business details were reviewed.",
      state: "complete",
    },
    {
      id: "decision",
      label: "Declined",
      description:
        application.denial_reason?.trim() ||
        "Your application was declined. You may submit a new application below.",
      state: "declined",
    },
    {
      id: "workspace",
      label: "Workspace Active",
      description: "Available after your application is approved.",
      state: "skipped",
    },
  ];
}
