/**
 * Fine-grained admin permission catalog.
 *
 * Mirrors the seed data in supabase/migrations/054_admin_access_control.sql
 * (admin_tier enum, admin_permissions, admin_role_permissions). The DB is
 * the source of truth for authorization decisions — ADMIN_TIER_PERMISSIONS
 * here exists only so the UI can render permission-aware nav/buttons
 * without an extra round trip. Never use it to make an authorization
 * decision that matters; always go through requirePermission()/
 * hasPermission() in admin-context.ts, which read the live DB state.
 */

export const ADMIN_TIERS = [
  "super_admin",
  "admin",
  "operations_admin",
  "finance_admin",
  "compliance_admin",
  "support_admin",
  "analyst",
] as const;

export type AdminTier = (typeof ADMIN_TIERS)[number];

export const ADMIN_TIER_LABELS: Record<AdminTier, string> = {
  super_admin: "Super Administrator",
  admin: "Administrator",
  operations_admin: "Operations Admin",
  finance_admin: "Finance Admin",
  compliance_admin: "Compliance Admin",
  support_admin: "Support Admin",
  analyst: "Analyst",
};

export const ADMIN_PERMISSIONS = [
  "admin.dashboard.view",

  "users.view",
  "users.verify",
  "users.suspend",
  "users.reactivate",

  "venues.view",
  "venues.review",
  "venues.approve",
  "venues.reject",
  "venues.suspend",

  "suppliers.view",
  "suppliers.review",
  "suppliers.approve",
  "suppliers.reject",
  "suppliers.suspend",

  "commissions.view",
  "commissions.manage",
  "commissions.override",
  "commissions.export",

  "payments.view",
  "payments.reconcile",
  "payments.refund",
  "payments.export",

  "disputes.view",
  "disputes.manage",
  "disputes.resolve",

  "reports.view",
  "reports.generate",
  "reports.export",

  "ai_config.view",
  "ai_config.manage",
  "ai_config.test",

  "marketplace.view",
  "marketplace.moderate",
  "marketplace.suspend_listing",

  "audit_logs.view",
  "audit_logs.export",

  "system_settings.view",
  "system_settings.manage",

  "admin_accounts.view",
  "admin_accounts.manage",
  "admin_roles.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/**
 * UI-hint only — see file header. Kept in sync with the migration's seed by
 * convention, not by code generation; if you change one, change the other.
 */
export const ADMIN_TIER_PERMISSIONS: Record<AdminTier, AdminPermission[]> = {
  super_admin: [...ADMIN_PERMISSIONS],

  admin: [
    "admin.dashboard.view",
    "users.view",
    "users.verify",
    "users.suspend",
    "users.reactivate",
    "venues.view",
    "venues.review",
    "venues.approve",
    "venues.reject",
    "venues.suspend",
    "suppliers.view",
    "suppliers.review",
    "suppliers.approve",
    "suppliers.reject",
    "suppliers.suspend",
    "commissions.view",
    "commissions.manage",
    "commissions.export",
    "payments.view",
    "payments.reconcile",
    "payments.export",
    "disputes.view",
    "disputes.manage",
    "disputes.resolve",
    "reports.view",
    "reports.generate",
    "reports.export",
    "marketplace.view",
    "marketplace.moderate",
    "marketplace.suspend_listing",
    "audit_logs.view",
    "system_settings.view",
    "admin_accounts.view",
  ],

  operations_admin: [
    "admin.dashboard.view",
    "users.view",
    "users.verify",
    "venues.view",
    "venues.review",
    "venues.approve",
    "venues.reject",
    "venues.suspend",
    "suppliers.view",
    "suppliers.review",
    "suppliers.approve",
    "suppliers.reject",
    "suppliers.suspend",
    "marketplace.view",
    "marketplace.moderate",
    "marketplace.suspend_listing",
    "payments.view",
    "disputes.view",
    "disputes.manage",
    "reports.view",
    "audit_logs.view",
  ],

  finance_admin: [
    "admin.dashboard.view",
    "commissions.view",
    "commissions.manage",
    "commissions.override",
    "commissions.export",
    "payments.view",
    "payments.reconcile",
    "payments.refund",
    "payments.export",
    "disputes.view",
    "disputes.manage",
    "disputes.resolve",
    "reports.view",
    "reports.generate",
    "reports.export",
    "audit_logs.view",
  ],

  compliance_admin: [
    "admin.dashboard.view",
    "users.view",
    "users.verify",
    "venues.view",
    "venues.review",
    "suppliers.view",
    "suppliers.review",
    "payments.view",
    "disputes.view",
    "reports.view",
    "audit_logs.view",
    "audit_logs.export",
  ],

  support_admin: [
    "admin.dashboard.view",
    "users.view",
    "users.suspend",
    "users.reactivate",
    "marketplace.view",
    "audit_logs.view",
  ],

  analyst: [
    "admin.dashboard.view",
    "disputes.view",
    "payments.view",
    "payments.export",
    "reports.view",
    "reports.generate",
    "reports.export",
    "audit_logs.view",
  ],
};

export function tierHasPermission(
  tier: AdminTier,
  permission: AdminPermission,
): boolean {
  return ADMIN_TIER_PERMISSIONS[tier].includes(permission);
}
