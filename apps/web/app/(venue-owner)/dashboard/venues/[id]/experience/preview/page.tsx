import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
  Panel,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  getVenueFaqCategoryLabel,
  getVenueSpaceLayoutLabel,
  getVenueSpaceSettingLabel,
  getVenueSpaceTypeLabel,
} from "@/src/features/venues/domain/structured-venue.types";
import { structuredVenueProfileRepository } from "@/src/features/venues/application/structured-profile-repository";
import {
  getOwnerDashboardContext,
  getOwnerVenueById,
  hasCoordinatorPermission,
} from "@/src/lib/dashboard/org-dashboard-data";
import { getPublishBlockingIssues } from "@/src/features/venues/utils/structured-editor";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";
import { StructuredPreviewActions } from "./preview-actions";

export const metadata: Metadata = {
  title: "Preview Structured Venue Experience",
};

type IdParams = {
  id: string;
};

type CapacityLayoutRow = {
  id: string;
  space_id: string;
  layout: string;
  custom_layout_label: string | null;
  capacity: number;
};

function unwrapRepoResult<T>(result: {
  ok: true;
  data: T;
} | {
  ok: false;
  error: { message: string };
}) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export default async function StructuredVenuePreviewPage({
  params,
}: {
  params: Promise<IdParams>;
}) {
  const { id } = await params;
  const context = await getOwnerDashboardContext();
  const venue = await getOwnerVenueById(
    context,
    id,
    "id, organization_id, name, slug, status, city, province, address, description, capacity_min, capacity_max, indoor_outdoor, base_price, price_unit",
  );

  if (!venue) notFound();

  const isOwner =
    context.isAdmin || context.roles.includes("venue_owner");
  const canView =
    isOwner ||
    hasCoordinatorPermission("manage_assigned_venue_listings", context);

  if (!canView) {
    return (
      <DashboardSubPage
        title="Preview Structured Venue Experience"
        description="Preview is available to venue owners and assigned coordinators."
      >
        <EmptyState
          title="Preview unavailable"
          description="You do not have permission to preview this venue profile draft."
          icon="lock"
        />
      </DashboardSubPage>
    );
  }

  const draftProfile = unwrapRepoResult(
    await structuredVenueProfileRepository.findDraftProfileForVenue(
      context.supabase,
      id,
    ),
  );

  if (!draftProfile) {
    return (
      <DashboardSubPage
        title="Preview Structured Venue Experience"
        description="Create a draft before opening the full preview."
      >
        <EmptyState
          title="No draft to preview"
          description="Start a structured venue draft, then return here to inspect the customer-facing preview."
          icon="visibility"
          action={
            <DashButton href={`/dashboard/venues/${id}/experience`} icon="edit">
              Open editor
            </DashButton>
          }
        />
      </DashboardSubPage>
    );
  }

  const activeSpaces = draftProfile.spaces.filter(
    (space) => space.status !== "archived",
  );
  const activeSpaceIds = activeSpaces.map((space) => space.id);
  const capacityLayoutsResult =
    activeSpaceIds.length > 0
      ? await context.supabase
          .from("venue_space_capacity_layouts")
          .select("id, space_id, layout, custom_layout_label, capacity")
          .in("space_id", activeSpaceIds)
          .order("display_order", { ascending: true })
      : { data: [], error: null };
  const capacityLayouts = (capacityLayoutsResult.data ?? []) as CapacityLayoutRow[];
  const activeMediaItems = draftProfile.mediaItems.filter(
    (item) => item.status !== "archived" && item.storagePath,
  );
  const activeFaqs = draftProfile.faqs.filter(
    (faq) => faq.status !== "archived",
  );
  const publishIssues = getPublishBlockingIssues(draftProfile);

  return (
    <DashboardSubPage
      title="Structured Venue Preview"
      description="Inspect unpublished structured content before publishing it to the customer venue profile."
      action={
        <StructuredPreviewActions
          venueId={venue.id}
          revisionId={draftProfile.revision.id}
          disabled={!isOwner || publishIssues.length > 0}
        />
      }
    >
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
        This is an authenticated preview. Customers will continue seeing the
        current public listing until a venue owner publishes this draft.
      </div>

      {publishIssues.length > 0 ? (
        <Panel className="mt-5 border-amber-200 bg-amber-50">
          <h2 className="text-lg font-bold text-amber-950">
            Publish checks needed
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
            {publishIssues.map((issue) => (
              <li key={issue}>- {issue}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel padding={false} className="mt-5 overflow-hidden">
        <div className="grid min-h-[360px] gap-0 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="relative min-h-[320px] bg-[#e2e8f0]">
            {activeMediaItems[0]?.storagePath ? (
              <Image
                src={getVenueMediaUrl(activeMediaItems[0].storagePath)}
                alt={activeMediaItems[0].altText ?? venue.name}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-[#64748b]">
                Add structured media in the editor to preview a richer hero.
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <StatusBadge status="draft" label="Draft preview" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
              {venue.name}
            </h1>
            <p className="mt-3 text-sm font-semibold text-[#64748b]">
              {[venue.city, venue.province].filter(Boolean).join(", ") ||
                venue.address ||
                "Location not set"}
            </p>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[#475569]">
              {venue.description ||
                "The current base listing description will continue to appear until richer structured copy is added in a later phase."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-bold text-[#1d4ed8]">
                {activeSpaces.length} spaces
              </span>
              <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-bold text-[#1d4ed8]">
                Up to {venue.capacity_max ?? "unset"} guests
              </span>
              <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-bold text-[#1d4ed8]">
                {venue.indoor_outdoor ?? "Setting not set"}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <h2 className="text-xl font-bold text-[#0f172a]">Spaces</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeSpaces.length === 0 ? (
                <p className="text-sm text-[#64748b]">
                  No structured spaces have been added yet.
                </p>
              ) : (
                activeSpaces.map((space) => (
                  <article
                    key={space.id}
                    className="rounded-2xl border border-[#dbe3ef] p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                      {getVenueSpaceSettingLabel(space.setting)}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-[#0f172a]">
                      {space.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {space.spaceType
                        ? getVenueSpaceTypeLabel(space.spaceType)
                        : "Flexible space"}{" "}
                      - up to {space.capacityMax} guests
                    </p>
                    {space.shortDescription || space.description ? (
                      <p className="mt-3 text-sm leading-6 text-[#475569]">
                        {space.shortDescription || space.description}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold text-[#0f172a]">Media story</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeMediaItems.length === 0 ? (
                <p className="text-sm text-[#64748b]">
                  No organized structured media yet.
                </p>
              ) : (
                activeMediaItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#dbe3ef]"
                  >
                    {item.storagePath ? (
                      <div className="relative aspect-[4/3] bg-[#e2e8f0]">
                        <Image
                          src={getVenueMediaUrl(item.storagePath)}
                          alt={item.altText ?? venue.name}
                          fill
                          sizes="(min-width: 1024px) 20vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    {item.caption ? (
                      <p className="p-3 text-sm font-semibold text-[#475569]">
                        {item.caption}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold text-[#0f172a]">Questions</h2>
            <div className="mt-5 space-y-3">
              {activeFaqs.length === 0 ? (
                <p className="text-sm text-[#64748b]">
                  No structured FAQs have been added yet.
                </p>
              ) : (
                activeFaqs.map((faq) => (
                  <article
                    key={faq.id}
                    className="rounded-2xl border border-[#dbe3ef] p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      {faq.category
                        ? getVenueFaqCategoryLabel(faq.category)
                        : "General"}
                    </p>
                    <h3 className="mt-2 text-base font-bold text-[#0f172a]">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#475569]">
                      {faq.answer}
                    </p>
                  </article>
                ))
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <h2 className="text-lg font-bold text-[#0f172a]">
              Practical details
            </h2>
            {draftProfile.logistics ? (
              <dl className="mt-4 space-y-4 text-sm">
                <PreviewDetail
                  label="Parking"
                  value={
                    draftProfile.logistics.parkingCapacity !== null
                      ? `${draftProfile.logistics.parkingCapacity} spaces`
                      : draftProfile.logistics.parkingNotes
                  }
                />
                <PreviewDetail
                  label="Arrival"
                  value={draftProfile.logistics.arrivalNotes}
                />
                <PreviewDetail
                  label="Weather backup"
                  value={
                    draftProfile.logistics.weatherBackupAvailable === null
                      ? draftProfile.logistics.weatherBackupNotes
                      : draftProfile.logistics.weatherBackupAvailable
                        ? "Available"
                        : "Not available"
                  }
                />
                <PreviewDetail
                  label="Curfew"
                  value={draftProfile.logistics.curfewTime}
                />
                <PreviewDetail
                  label="Supplier rules"
                  value={draftProfile.logistics.externalSupplierRules}
                />
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#64748b]">
                Add logistics before publishing the structured profile.
              </p>
            )}
          </Panel>

          <Panel>
            <h2 className="text-lg font-bold text-[#0f172a]">
              Capacity layouts
            </h2>
            <div className="mt-4 space-y-3">
              {activeSpaces.flatMap((space) =>
                capacityLayouts
                  .filter((layout) => layout.space_id === space.id)
                  .map((layout) => (
                  <div
                    key={`${space.id}-${layout.id}`}
                    className="rounded-2xl border border-[#dbe3ef] p-3"
                  >
                    <p className="text-sm font-bold text-[#0f172a]">
                      {space.name}
                    </p>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {layout.layout === "custom"
                        ? layout.custom_layout_label
                        : getVenueSpaceLayoutLabel(
                            layout.layout as Parameters<
                              typeof getVenueSpaceLayoutLabel
                            >[0],
                          )}{" "}
                      - {layout.capacity} guests
                    </p>
                  </div>
                )),
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-bold text-[#0f172a]">Next step</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Return to the editor to adjust content, or publish once checks are
              complete.
            </p>
            <Link
              href={`/dashboard/venues/${venue.id}/experience`}
              className="mt-4 inline-flex text-sm font-bold text-[#1d4ed8] hover:underline"
            >
              Continue editing
            </Link>
          </Panel>
        </aside>
      </div>
    </DashboardSubPage>
  );
}

function PreviewDetail({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === "") return null;

  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
        {label}
      </dt>
      <dd className="mt-1 font-semibold leading-6 text-[#334155]">{value}</dd>
    </div>
  );
}
