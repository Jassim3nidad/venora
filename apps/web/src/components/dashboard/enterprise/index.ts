export { EnterpriseShell } from "./EnterpriseShell";
export { MaterialIcon } from "./MaterialIcon";
export { VenueOwnerOverview } from "./VenueOwnerOverview";
export type { VenueOwnerBooking, VenueOwnerOverviewProps } from "./VenueOwnerOverview";
export { CoordinatorOverview } from "./CoordinatorOverview";
export type {
  CoordinatorOverviewProps,
  CoordinatorEventRow,
  CoordinatorVenueRow,
} from "./CoordinatorOverview";
export { SupplierOverview } from "./SupplierOverview";
export type { SupplierOverviewProps } from "./SupplierOverview";
export { AdminOverview } from "./AdminOverview";
export type { AdminOverviewProps } from "./AdminOverview";
export { ADMIN_MODULES } from "./admin-modules";
export type { AdminModule } from "./admin-modules";
export {
  DashboardPage,
  DashboardSubPage,
  PageHeader,
  Panel,
  PanelHeader,
  KpiCard,
  DataTable,
  StatusBadge,
  DashButton,
  EmptyState,
} from "./ui";
export type { DataTableColumn } from "./ui";
export {
  NAV_BY_ROLE,
  ROLE_LABELS,
} from "./nav-config";
export type { EnterpriseRole, NavItem } from "./nav-config";
import dynamic from "next/dynamic";

// recharts is one of the largest client dependencies in the app; these
// four chart components are only used on 5 of ~90 routes, so defer their
// (and recharts') JS out of those routes' main bundle instead of eagerly
// bundling it into every page that imports from this barrel.
export const RevenueTrendChart = dynamic(() =>
  import("./charts").then((m) => m.RevenueTrendChart),
);
export const StatusDistributionChart = dynamic(() =>
  import("./charts").then((m) => m.StatusDistributionChart),
);
export const TopItemsBarChart = dynamic(() =>
  import("./charts").then((m) => m.TopItemsBarChart),
);
export const DemographicsBarChart = dynamic(() =>
  import("./charts").then((m) => m.DemographicsBarChart),
);
export { CHART_COLORS, CATEGORICAL_PALETTE } from "./charts";
export type {
  RevenueTrendPoint,
  StatusDistributionPoint,
  TopItem,
  DemographicsBucket,
} from "./charts";
