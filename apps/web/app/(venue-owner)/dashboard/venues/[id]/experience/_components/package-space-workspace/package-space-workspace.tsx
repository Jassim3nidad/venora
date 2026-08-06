"use client";

import { type FormEvent, useState } from "react";
import { ChevronDown, PackageOpen } from "lucide-react";
import { Panel, StatusBadge } from "@/components/dashboard/enterprise";
import { SectionTitle } from "../section-title";
import { SubmitButton } from "../submit-button";
import {
  PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
  getPackageVenueSpaceInclusionTypeLabel,
  type DraftStructuredVenueProfile,
  type VenueSpace
} from "@/src/features/venues/domain/structured-venue.types";
import { cn } from "@venora/lib";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";

const peso = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function PackageSpaceWorkspace({
  packages,
  spaces,
  profile,
  onSave,
}: {
  packages: any[]; // PackageRow from client
  spaces: VenueSpace[];
  profile: DraftStructuredVenueProfile;
  onSave: (event: FormEvent<HTMLFormElement>, packageId: string) => void;
}) {
  const activePackages = packages.filter((pkg) => pkg.is_active);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  const togglePackage = (pkgId: string) => {
    setExpandedPackageId((prev) => (prev === pkgId ? null : pkgId));
  };

  return (
    <Panel>
      <SectionTitle
        title="Packages"
        description="Connect existing packages to one or more spaces without changing package pricing. This helps customers filter venues by their preferred package type."
      />
      {activePackages.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center">
          <PackageOpen className="mb-4 h-12 w-12 text-[#94a3b8]" />
          <h4 className="text-base font-bold text-[#0f172a]">No active packages</h4>
          <p className="mt-1 max-w-sm text-sm leading-6 text-[#64748b]">
            Create packages from the package dashboard first, then link them to spaces here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePackages.map((pkg) => {
            const linked = profile.packageSpaces.filter(
              (link) => link.packageId === pkg.id,
            );
            const linkedIds = new Set(linked.map((link) => link.spaceId));
            const isExpanded = expandedPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white shadow-sm transition-all",
                  isExpanded ? "border-[#93c5fd] ring-1 ring-[#93c5fd]" : "border-[#dbe3ef] hover:border-[#93c5fd]"
                )}
              >
                <button
                  type="button"
                  onClick={() => togglePackage(pkg.id)}
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[#f8fbff]"
                >
                  <div>
                    <h3 className="text-base font-bold text-[#0f172a]">{pkg.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#64748b]">
                      {peso(pkg.price)} · {pkg.price_unit.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={linked.length > 0 ? "active" : "draft"} label={`${linked.length} spaces linked`} />
                    <ChevronDown className={cn("h-5 w-5 text-[#94a3b8] transition-transform", isExpanded ? "rotate-180" : "")} />
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-[#dbe3ef] bg-[#f8fbff] p-5">
                    <form onSubmit={(event) => onSave(event, pkg.id)}>
                      <h4 className="mb-4 text-sm font-bold text-[#334155]">Linked Spaces</h4>
                      {spaces.length === 0 ? (
                        <p className="rounded-lg bg-white p-4 text-sm text-[#64748b] border border-[#dbe3ef]">
                          Add a space in the Spaces tab before linking packages.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {spaces.map((space) => {
                            const link = linked.find((item) => item.spaceId === space.id);
                            const isChecked = linkedIds.has(space.id);
                            
                            return (
                              <div key={space.id} className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm transition focus-within:border-[#93c5fd] focus-within:ring-1 focus-within:ring-[#93c5fd]">
                                <label className="flex cursor-pointer items-center gap-3 text-base font-bold text-[#0f172a]">
                                  <input
                                    name="spaceIds"
                                    type="checkbox"
                                    value={space.id}
                                    defaultChecked={isChecked}
                                    className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]"
                                  />
                                  {space.name}
                                </label>
                                <div className="mt-4 grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                                  <select
                                    name={`inclusionType-${space.id}`}
                                    defaultValue={link?.inclusionType ?? "included"}
                                    className={inputClass}
                                  >
                                    {PACKAGE_VENUE_SPACE_INCLUSION_TYPES.map((value) => (
                                      <option key={value} value={value}>
                                        {getPackageVenueSpaceInclusionTypeLabel(value)}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    name={`notes-${space.id}`}
                                    defaultValue={link?.inclusionNotes ?? ""}
                                    className={inputClass}
                                    placeholder="Optional inclusion notes (e.g. 'Standard lighting only')"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-6 pt-4 border-t border-[#dbe3ef]">
                        <SubmitButton label="Save relationships" />
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
