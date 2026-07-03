"use client";

import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <EnterpriseShell role="admin">{children}</EnterpriseShell>;
}
