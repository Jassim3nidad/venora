type ResolveScopedVenueIdsInput = {
  isAdmin: boolean;
  roles: string[];
  organizationVenueIds: string[];
  assignedVenueIds: string[];
};

export function resolveScopedVenueIds({
  isAdmin,
  roles,
  organizationVenueIds,
  assignedVenueIds,
}: ResolveScopedVenueIdsInput) {
  if (isAdmin || roles.includes("venue_owner")) {
    return organizationVenueIds;
  }

  if (roles.includes("event_coordinator")) {
    return assignedVenueIds.filter((venueId) =>
      organizationVenueIds.includes(venueId),
    );
  }

  return [];
}
