-- Backfill super_admin with the full admin permission catalog.
--
-- 076_admin_disputes.sql seeded disputes.view/manage/resolve for admin,
-- operations_admin, finance_admin, compliance_admin, and analyst but omitted
-- super_admin, so /admin/disputes redirected super_admins to /unauthorized
-- even though ADMIN_TIER_PERMISSIONS in permissions.ts (a UI hint only)
-- renders the nav item.
--
-- This is written as a set-based backfill rather than three hardcoded rows so
-- that any future permission introduced without an explicit super_admin grant
-- is corrected the next time this class of migration runs. It grants nothing
-- that isn't already in admin_permissions and changes no other tier.

INSERT INTO public.admin_role_permissions (tier, permission_key)
SELECT 'super_admin', key
FROM public.admin_permissions
ON CONFLICT (tier, permission_key) DO NOTHING;
