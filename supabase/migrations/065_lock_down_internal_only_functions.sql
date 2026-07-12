-- ============================================================
-- Migration 065 — Harden grants on internal-only SECURITY DEFINER functions
-- ============================================================
--
-- Migration 047 documented that `REVOKE EXECUTE ... FROM PUBLIC` alone is
-- not sufficient to lock a function down on this project — it must also
-- explicitly revoke from `anon, authenticated` by name (see 047's own
-- header comment for the mechanism). That pattern was applied to the
-- payment/webhook RPCs in 047 but was not consistently carried forward to
-- every function created afterward.
--
-- This migration brings the following internal-only functions in line
-- with the same pattern established in 047. None of them are called
-- directly from apps/web or Supabase Edge Function client code except
-- retry_failed_notification_deliveries, which already authenticates with
-- the service-role key — restricting it to service_role-only does not
-- change that caller's behavior. All are otherwise invoked only from
-- other SECURITY DEFINER functions/triggers, which execute as the
-- function owner and are unaffected by tightening grants for
-- anon/authenticated/PUBLIC.
--
-- Functions covered: resolve_commission, disable_sms_notification_deliveries,
-- retry_failed_notification_deliveries, log_audit, create_notification,
-- notify_admins, log_admin_action.
--
-- Purely a grants/comments migration — REVOKE is a no-op if a role never
-- held the privilege, so this is safe to apply regardless of current live
-- grant state. No function body changes. Additive; does not edit any
-- prior migration's CREATE FUNCTION statement.
--
-- Preflight (run first to see current grants):
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'resolve_commission', 'disable_sms_notification_deliveries',
--       'retry_failed_notification_deliveries', 'log_audit',
--       'create_notification', 'notify_admins', 'log_admin_action'
--     )
--   ORDER BY routine_name, grantee;
--
-- Verification (run after applying — expect ONLY service_role rows for
-- the first three, and zero rows for the remaining four):
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'resolve_commission', 'disable_sms_notification_deliveries',
--       'retry_failed_notification_deliveries', 'log_audit',
--       'create_notification', 'notify_admins', 'log_admin_action'
--     )
--   ORDER BY routine_name, grantee;
--
-- Rollback (re-grant to anon/authenticated — only for emergency revert;
-- restores the weaker grant state this migration tightens):
--   GRANT EXECUTE ON FUNCTION public.resolve_commission(uuid, numeric) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.disable_sms_notification_deliveries() TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.retry_failed_notification_deliveries(integer) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.create_notification(uuid, public.notification_kind, text, text, text, jsonb, public.notification_priority, text, uuid) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.notify_admins(public.notification_kind, text, text, text, jsonb, public.notification_priority, text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, text, jsonb, jsonb, jsonb) TO anon, authenticated;

-- Already service_role-only by grant; close the anon/authenticated gap
-- default privileges reopen.
REVOKE EXECUTE ON FUNCTION public.resolve_commission(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.disable_sms_notification_deliveries() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.retry_failed_notification_deliveries(integer) FROM PUBLIC, anon, authenticated;

-- Internal-only helpers with no existing grant/revoke at all — never
-- intended to be called directly (only from other SECURITY DEFINER
-- functions/triggers, which run as the owner role and are unaffected).
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, public.notification_kind, text, text, text, jsonb, public.notification_priority, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins(public.notification_kind, text, text, text, jsonb, public.notification_priority, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.resolve_commission(uuid, numeric) IS
  'Resolves the commission rule/rate/type for a venue+amount (venue > category > global, deterministic tiebreak). service_role only (065), consistent with the grant pattern established in 047.';
COMMENT ON FUNCTION public.log_audit(text, text, uuid, jsonb) IS
  'Internal-only audit-log writer, invoked only from other SECURITY DEFINER functions. Not directly callable (065), consistent with the grant pattern established in 047.';
COMMENT ON FUNCTION public.create_notification(uuid, public.notification_kind, text, text, text, jsonb, public.notification_priority, text, uuid) IS
  'Internal-only in-app notification writer, invoked only from other SECURITY DEFINER functions/triggers. Not directly callable (065), consistent with the grant pattern established in 047.';
COMMENT ON FUNCTION public.notify_admins(public.notification_kind, text, text, text, jsonb, public.notification_priority, text) IS
  'Internal-only broadcast to every admin via create_notification(). Not directly callable (065), consistent with the grant pattern established in 047.';
COMMENT ON FUNCTION public.log_admin_action(text, text, uuid, text, jsonb, jsonb, jsonb) IS
  'Internal-only admin audit-log writer, invoked only from other SECURITY DEFINER functions. Not directly callable (065), consistent with the grant pattern established in 047.';
