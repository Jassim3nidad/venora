-- ============================================================
-- Migration 054 — Administrator Access Control
-- ============================================================
--
-- Today `public.is_admin()` is a single flat gate: an account either has
-- user_roles.role = 'admin' (full access to everything is_admin() guards)
-- or it doesn't. This migration layers a fine-grained permission system on
-- TOP of that gate without touching it — user_roles / is_admin() / has_role()
-- are untouched and every existing RLS policy that depends on them keeps
-- working exactly as before.
--
-- New concepts:
--   admin_tier              — which *kind* of admin an account is.
--   admin_permissions        — catalog of granular capabilities.
--   admin_role_permissions   — which permissions each tier has.
--   admin_user_roles         — the tier assigned to a given admin account.
--   has_admin_permission()   — the check every new admin feature should use
--                              instead of a bare is_admin() call.
--   admin_assign_tier()      — the ONLY way to write admin_user_roles; a
--                              raw UPDATE can't express "you can't edit your
--                              own row" or "don't demote the last super
--                              admin" cleanly via RLS alone, so those rules
--                              live here instead (mirrors the
--                              prevent_self_role_change trigger already
--                              enforced on user_roles since migration 022).
--   log_admin_action()       — thin wrapper around the existing log_audit()
--                              helper with the richer field set (reason,
--                              previous/new values, actor role) that the
--                              audit log viewer needs. Existing callers of
--                              log_audit() are untouched.
--
-- Existing accounts with user_roles.role = 'admin' are backfilled to the
-- 'super_admin' tier below — this is the safest default: it preserves their
-- current (unrestricted) level of access rather than silently narrowing it.

-- ── admin_tier enum ───────────────────────────────────────────
CREATE TYPE public.admin_tier AS ENUM (
  'super_admin',
  'admin',
  'operations_admin',
  'finance_admin',
  'compliance_admin',
  'support_admin',
  'analyst'
);

-- ── admin_permissions (catalog) ───────────────────────────────
CREATE TABLE public.admin_permissions (
  key         text        PRIMARY KEY,
  description text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_permissions IS
  'Catalog of granular admin capabilities. Seeded below; extend by inserting new rows, never by editing application code alone.';

-- ── admin_role_permissions (tier -> permission map) ───────────
CREATE TABLE public.admin_role_permissions (
  tier           public.admin_tier NOT NULL,
  permission_key text              NOT NULL REFERENCES public.admin_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (tier, permission_key)
);

-- ── admin_user_roles (one tier per admin account) ─────────────
CREATE TABLE public.admin_user_roles (
  user_id     uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier        public.admin_tier NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  assigned_by uuid        REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_user_roles_updated_at
  BEFORE UPDATE ON public.admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_admin_user_roles_tier ON public.admin_user_roles(tier) WHERE is_active;

COMMENT ON TABLE public.admin_user_roles IS
  'Fine-grained tier for an admin account (user_roles.role=admin is the coarse "is this an admin at all" gate; this is the specific tier). Never write directly - use admin_assign_tier() so self-protection and last-super-admin checks apply.';

-- ── has_admin_permission(): the check new admin features should use ──
CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT public.is_admin() AND EXISTS (
    SELECT 1
    FROM public.admin_user_roles aur
    JOIN public.admin_role_permissions arp ON arp.tier = aur.tier
    WHERE aur.user_id = auth.uid()
      AND aur.is_active
      AND arp.permission_key = p_permission
  );
$$;

COMMENT ON FUNCTION public.has_admin_permission(text) IS
  'Granular permission check for admin accounts. Returns false for non-admins, admins with no tier row, or a tier lacking the permission. Use instead of is_admin() for any admin action that should be restricted to specific tiers.';

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.admin_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_permissions.select.admin"
  ON public.admin_permissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_role_permissions.select.admin"
  ON public.admin_role_permissions FOR SELECT
  USING (public.is_admin());

-- Self can see their own tier (e.g. to render permission-aware nav);
-- viewing OTHER admins' tiers requires the admin_accounts.view permission.
CREATE POLICY "admin_user_roles.select.self_or_permitted"
  ON public.admin_user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_admin_permission('admin_accounts.view'));

-- Deliberately no INSERT/UPDATE/DELETE policy on any of the three tables
-- above. All writes to admin_user_roles go through admin_assign_tier();
-- admin_permissions/admin_role_permissions are seeded by migration only.

-- ── admin_assign_tier(): the only way to write admin_user_roles ──
CREATE OR REPLACE FUNCTION public.admin_assign_tier(
  p_target_user_id uuid,
  p_new_tier       public.admin_tier,
  p_reason         text DEFAULT NULL
)
RETURNS public.admin_user_roles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_actor                uuid := auth.uid();
  v_row                  public.admin_user_roles%ROWTYPE;
  v_previous_tier        public.admin_tier;
  v_other_active_supers  int;
BEGIN
  IF NOT public.has_admin_permission('admin_roles.manage') THEN
    RAISE EXCEPTION 'You do not have permission to manage administrator roles';
  END IF;

  -- Self-protection: no admin, including a super_admin, may change their own
  -- tier. Mirrors prevent_self_role_change on user_roles (migration 022) -
  -- a tier change always requires a second administrator to act.
  IF v_actor = p_target_user_id THEN
    RAISE EXCEPTION 'You cannot change your own administrator tier';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_target_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Target user does not hold the admin role';
  END IF;

  -- Lock the target's row (if any) so two concurrent tier changes can't race.
  SELECT * INTO v_row
  FROM public.admin_user_roles
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  v_previous_tier := v_row.tier; -- NULL if this admin has no tier row yet

  -- Guard: never leave the platform with zero active super admins.
  IF v_previous_tier = 'super_admin' AND p_new_tier <> 'super_admin' THEN
    SELECT count(*) INTO v_other_active_supers
    FROM public.admin_user_roles
    WHERE tier = 'super_admin' AND is_active AND user_id <> p_target_user_id;

    IF v_other_active_supers = 0 THEN
      RAISE EXCEPTION 'Cannot demote the last active super administrator';
    END IF;
  END IF;

  INSERT INTO public.admin_user_roles (user_id, tier, assigned_by, is_active)
  VALUES (p_target_user_id, p_new_tier, v_actor, true)
  ON CONFLICT (user_id) DO UPDATE
    SET tier         = EXCLUDED.tier,
        assigned_by  = EXCLUDED.assigned_by,
        is_active    = true,
        updated_at   = now()
  RETURNING * INTO v_row;

  PERFORM public.log_admin_action(
    'admin_role.assigned',
    'admin_user_roles',
    p_target_user_id,
    p_reason,
    NULL,
    CASE WHEN v_previous_tier IS NULL THEN NULL ELSE jsonb_build_object('tier', v_previous_tier) END,
    jsonb_build_object('tier', p_new_tier)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_tier(uuid, public.admin_tier, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_tier(uuid, public.admin_tier, text) TO authenticated;

COMMENT ON FUNCTION public.admin_assign_tier(uuid, public.admin_tier, text) IS
  'Assigns or changes an admin account''s tier. Enforces admin_roles.manage permission, blocks self-modification, and blocks demoting the last active super_admin. Writes an audit log entry.';

-- ================================================================
-- Audit log: richer field set + missing index
-- ================================================================
-- audit_logs already exists (migration 011) and is actively written to by
-- payment/booking/notification triggers. Adding columns only - existing
-- rows/readers are unaffected, and log_audit() keeps working unchanged.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_role      public.user_role,
  ADD COLUMN IF NOT EXISTS reason          text,
  ADD COLUMN IF NOT EXISTS previous_values jsonb,
  ADD COLUMN IF NOT EXISTS new_values      jsonb;

-- The existing indexes are (entity_type, entity_id) and (actor_id, created_at).
-- Neither serves a plain "recent activity across the whole platform" scan.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action          text,
  p_resource_type   text,
  p_resource_id     uuid  DEFAULT NULL,
  p_reason          text  DEFAULT NULL,
  p_metadata        jsonb DEFAULT NULL,
  p_previous_values jsonb DEFAULT NULL,
  p_new_values      jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_actor_role public.user_role;
BEGIN
  SELECT role INTO v_actor_role FROM public.user_roles WHERE user_id = auth.uid();

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, entity_type, entity_id,
    reason, metadata, previous_values, new_values
  )
  VALUES (
    auth.uid(), v_actor_role, p_action, p_resource_type, p_resource_id,
    p_reason, p_metadata, p_previous_values, p_new_values
  );
END;
$$;

COMMENT ON FUNCTION public.log_admin_action(text, text, uuid, text, jsonb, jsonb, jsonb) IS
  'Preferred audit helper for admin mutations - wraps the same audit_logs table as log_audit() but also captures reason/previous/new values and the actor''s role. log_audit() is untouched for existing non-admin callers.';

-- Tighten audit_logs read access to the granular permission (was: any
-- is_admin() account). Append-only guarantee is unchanged - still no
-- UPDATE/DELETE policy exists for any role.
DROP POLICY IF EXISTS "audit.select.admin" ON public.audit_logs;

CREATE POLICY "audit_logs.select.permitted"
  ON public.audit_logs FOR SELECT
  USING (public.has_admin_permission('audit_logs.view'));

-- ================================================================
-- Seed: permission catalog
-- ================================================================

INSERT INTO public.admin_permissions (key, description) VALUES
  ('admin.dashboard.view',      'View the administrator dashboard overview'),

  ('users.view',                'View user accounts and verification status'),
  ('users.verify',              'Approve, reject, or request info on user verification'),
  ('users.suspend',             'Suspend a user account'),
  ('users.reactivate',          'Reactivate a suspended user account'),

  ('venues.view',               'View venue listings and their review state'),
  ('venues.review',             'Begin/continue reviewing a venue submission'),
  ('venues.approve',            'Approve a venue listing'),
  ('venues.reject',             'Reject a venue listing'),
  ('venues.suspend',            'Suspend a published venue listing'),

  ('suppliers.view',            'View supplier profiles and accreditation state'),
  ('suppliers.review',          'Begin/continue reviewing a supplier submission'),
  ('suppliers.approve',         'Approve a supplier profile'),
  ('suppliers.reject',          'Reject a supplier profile'),
  ('suppliers.suspend',         'Suspend an accredited supplier'),

  ('commissions.view',          'View commission rules and history'),
  ('commissions.manage',        'Create and edit commission rules'),
  ('commissions.override',      'Manually override a calculated commission'),
  ('commissions.export',        'Export commission reports'),

  ('reports.view',               'View platform reports'),
  ('reports.generate',           'Generate a new report'),
  ('reports.export',             'Export a report (CSV/PDF)'),

  ('ai_config.view',             'View AI feature configuration'),
  ('ai_config.manage',           'Change AI feature configuration'),
  ('ai_config.test',             'Run a safe test of an AI configuration'),

  ('marketplace.view',           'View marketplace monitoring signals'),
  ('marketplace.moderate',       'Moderate flagged marketplace listings/cases'),
  ('marketplace.suspend_listing','Suspend a listing from the marketplace monitor'),

  ('audit_logs.view',             'View audit log entries'),
  ('audit_logs.export',           'Export audit log entries'),

  ('system_settings.view',        'View system settings'),
  ('system_settings.manage',      'Change system settings'),

  ('admin_accounts.view',         'View administrator accounts and tiers'),
  ('admin_accounts.manage',       'Suspend/reactivate administrator accounts'),
  ('admin_roles.manage',          'Assign or change an administrator''s tier');

-- ================================================================
-- Seed: default tier -> permission map
-- ================================================================
-- super_admin gets everything. Other tiers get a scope matching their name;
-- adjust via admin_role_permissions if the business wants a different split
-- later - this is data, not code.

INSERT INTO public.admin_role_permissions (tier, permission_key)
SELECT 'super_admin', key FROM public.admin_permissions;

INSERT INTO public.admin_role_permissions (tier, permission_key) VALUES
  -- admin: full operational access, but cannot manage other admins/roles
  -- or touch system-wide settings/AI config.
  ('admin', 'admin.dashboard.view'),
  ('admin', 'users.view'), ('admin', 'users.verify'), ('admin', 'users.suspend'), ('admin', 'users.reactivate'),
  ('admin', 'venues.view'), ('admin', 'venues.review'), ('admin', 'venues.approve'), ('admin', 'venues.reject'), ('admin', 'venues.suspend'),
  ('admin', 'suppliers.view'), ('admin', 'suppliers.review'), ('admin', 'suppliers.approve'), ('admin', 'suppliers.reject'), ('admin', 'suppliers.suspend'),
  ('admin', 'commissions.view'), ('admin', 'commissions.manage'), ('admin', 'commissions.export'),
  ('admin', 'reports.view'), ('admin', 'reports.generate'), ('admin', 'reports.export'),
  ('admin', 'marketplace.view'), ('admin', 'marketplace.moderate'), ('admin', 'marketplace.suspend_listing'),
  ('admin', 'audit_logs.view'),
  ('admin', 'system_settings.view'),
  ('admin', 'admin_accounts.view'),

  -- operations_admin: day-to-day marketplace operations (verification,
  -- approvals, moderation) without financial or system-config authority.
  ('operations_admin', 'admin.dashboard.view'),
  ('operations_admin', 'users.view'), ('operations_admin', 'users.verify'),
  ('operations_admin', 'venues.view'), ('operations_admin', 'venues.review'), ('operations_admin', 'venues.approve'), ('operations_admin', 'venues.reject'), ('operations_admin', 'venues.suspend'),
  ('operations_admin', 'suppliers.view'), ('operations_admin', 'suppliers.review'), ('operations_admin', 'suppliers.approve'), ('operations_admin', 'suppliers.reject'), ('operations_admin', 'suppliers.suspend'),
  ('operations_admin', 'marketplace.view'), ('operations_admin', 'marketplace.moderate'), ('operations_admin', 'marketplace.suspend_listing'),
  ('operations_admin', 'reports.view'),
  ('operations_admin', 'audit_logs.view'),

  -- finance_admin: commissions, payouts, financial reporting.
  ('finance_admin', 'admin.dashboard.view'),
  ('finance_admin', 'commissions.view'), ('finance_admin', 'commissions.manage'), ('finance_admin', 'commissions.override'), ('finance_admin', 'commissions.export'),
  ('finance_admin', 'reports.view'), ('finance_admin', 'reports.generate'), ('finance_admin', 'reports.export'),
  ('finance_admin', 'audit_logs.view'),

  -- compliance_admin: verification review and audit oversight.
  ('compliance_admin', 'admin.dashboard.view'),
  ('compliance_admin', 'users.view'), ('compliance_admin', 'users.verify'),
  ('compliance_admin', 'venues.view'), ('compliance_admin', 'venues.review'),
  ('compliance_admin', 'suppliers.view'), ('compliance_admin', 'suppliers.review'),
  ('compliance_admin', 'reports.view'),
  ('compliance_admin', 'audit_logs.view'), ('compliance_admin', 'audit_logs.export'),

  -- support_admin: front-line user account actions only.
  ('support_admin', 'admin.dashboard.view'),
  ('support_admin', 'users.view'), ('support_admin', 'users.suspend'), ('support_admin', 'users.reactivate'),
  ('support_admin', 'marketplace.view'),
  ('support_admin', 'audit_logs.view'),

  -- analyst: strictly read-only reporting. No mutation permissions anywhere.
  ('analyst', 'admin.dashboard.view'),
  ('analyst', 'reports.view'), ('analyst', 'reports.generate'), ('analyst', 'reports.export'),
  ('analyst', 'audit_logs.view');

-- ================================================================
-- Backfill: every existing admin becomes a super_admin
-- ================================================================
-- Safest default - preserves current (unrestricted) access rather than
-- silently narrowing it. A super_admin can re-tier these accounts later
-- via admin_assign_tier() once the access-control UI is in use.

INSERT INTO public.admin_user_roles (user_id, tier, assigned_by, is_active)
SELECT user_id, 'super_admin', NULL, true
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;
