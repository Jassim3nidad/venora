// Re-exported from the shared location so both the venue-owner and
// event-coordinator dashboards (which operate on the same
// organization-scoped data) use a single implementation.
export {
  type OwnerDashboardContext,
  getOwnerDashboardContext,
  getOwnerVenueIds,
  getOwnerVenueById,
  formatPeso,
  formatDate,
} from "@/lib/dashboard/org-dashboard-data";
