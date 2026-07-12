"use client";

import Link from "next/link";
import {
  DashboardPage,
  DashButton,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "./ui";
import { MaterialIcon } from "./MaterialIcon";
import { ADMIN_MODULES } from "./admin-modules";

export type AdminOverviewProps = {
  totalUsers: number;
  pendingVenues: number;
  supplierReviews: number;
  pendingApplications: number;
  pendingReviews: Array<{
    id: string;
    item: string;
    type: string;
    submittedBy: string;
    status: string;
  }>;
  /**
   * hrefs from ADMIN_MODULES the current admin is permitted to see, computed
   * server-side against the same NAV_BY_ROLE.admin permission mapping the
   * sidebar uses (see app/(admin)/admin/page.tsx) -- not a second
   * permission source.
   */
  visibleModuleHrefs: string[];
  canReviewApplications: boolean;
  canReviewVenues: boolean;
};

const PLATFORM_HEALTH = [
  { label: "Role-based access control", status: "Active", icon: "shield" },
  { label: "Venue approval workflow", status: "Online", icon: "verified" },
  { label: "Supplier verification", status: "Needs Review", icon: "badge" },
  { label: "Reports and analytics", status: "Ready", icon: "analytics" },
];

export function AdminOverview({
  totalUsers,
  pendingVenues,
  supplierReviews,
  pendingApplications,
  pendingReviews,
  visibleModuleHrefs,
  canReviewApplications,
  canReviewVenues,
}: AdminOverviewProps) {
  const visibleModules = ADMIN_MODULES.filter((mod) =>
    visibleModuleHrefs.includes(mod.href),
  );

  const kpis = [
    {
      label: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: "group",
      highlight: true,
    },
    {
      label: "Partner Applications",
      value: String(pendingApplications),
      icon: "how_to_reg",
    },
    {
      label: "Pending Venues",
      value: String(pendingVenues),
      icon: "location_city",
    },
    {
      label: "Supplier Reviews",
      value: String(supplierReviews),
      icon: "storefront",
    },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
            Administrator
          </span>
          <h1 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
            Platform Admin
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#4b5563]">
            Manage users, venue approvals, supplier accreditation, commissions,
            and platform operations.
          </p>
        </div>
        {(canReviewApplications || canReviewVenues) && (
          <div className="flex flex-wrap gap-2">
            {canReviewApplications && (
              <DashButton href="/admin/applications" variant="secondary" icon="how_to_reg">
                Review Applications
              </DashButton>
            )}
            {canReviewVenues && (
              <DashButton href="/admin/venues" icon="arrow_forward">
                Review Venues
              </DashButton>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div data-testid="admin-modules-panel">
        <Panel>
          <PanelHeader
            title="Admin Modules"
            description="Quick access to major administrator tools."
          />
          {visibleModules.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleModules.map((mod) => (
                <Link
                  key={mod.title}
                  href={mod.href}
                  className="group rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4 transition hover:border-[#1d4ed8] hover:bg-[#eff6ff]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1d4ed8] shadow-sm">
                      <MaterialIcon name={mod.icon} />
                    </div>
                    <MaterialIcon
                      name="arrow_forward"
                      className="text-[#6b7280] transition group-hover:text-[#1d4ed8]"
                    />
                  </div>
                  <p className="font-semibold text-[#111827]">{mod.title}</p>
                  <p className="mt-1 text-sm text-[#4b5563]">{mod.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="lock"
              title="No modules available"
              description="Your administrator tier doesn't have access to any quick-access modules yet."
            />
          )}
        </Panel>
        </div>

        <Panel>
          <PanelHeader title="Platform Health" />
          <div className="space-y-2">
            {PLATFORM_HEALTH.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                    <MaterialIcon name={item.icon} className="text-lg" />
                  </div>
                  <p className="text-sm font-semibold text-[#111827]">
                    {item.label}
                  </p>
                </div>
                <StatusBadge status="active" label={item.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel padding={false} className="overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
          <PanelHeader
            title="Pending Reviews"
            description="Latest venue and supplier submissions awaiting review."
            action={
              canReviewVenues ? (
                <DashButton href="/admin/venues" variant="secondary">
                  Manage Reviews
                </DashButton>
              ) : undefined
            }
          />
        </div>
        <div className="p-5 sm:p-6">
          <DataTable
            rows={pendingReviews}
            keyFn={(r) => r.id}
            emptyMessage="No pending reviews."
            columns={[
              {
                key: "item",
                header: "Item",
                cell: (r) => (
                  <span className="font-semibold text-[#111827]">{r.item}</span>
                ),
              },
              { key: "type", header: "Type", cell: (r) => r.type },
              { key: "by", header: "Submitted By", cell: (r) => r.submittedBy },
              {
                key: "status",
                header: "Status",
                cell: (r) => <StatusBadge status="pending" label={r.status} />,
              },
            ]}
          />
        </div>
      </Panel>
    </DashboardPage>
  );
}
