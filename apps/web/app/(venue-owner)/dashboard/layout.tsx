"use client";

import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default function VenueOwnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <EnterpriseShell role="venue_owner">{children}</EnterpriseShell>;
}
