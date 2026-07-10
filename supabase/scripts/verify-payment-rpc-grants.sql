-- ============================================================
-- Payment RPC grant regression check (dynamic introspection)
-- ============================================================
--
-- Discovers payment-related functions dynamically from pg_proc by name
-- pattern — NOT from a hardcoded signature list — then verifies each
-- one's actual grants using aclexplode against pg_proc.proacl, with a
-- has_function_privilege() cross-check for defense against any
-- aclexplode/acldefault edge case.
--
-- Classification is by name pattern only (see v_service_only_patterns /
-- v_customer_facing_patterns below) — this file has no dependency on
-- exact parameter lists, so a signature change (e.g. confirm_booking_payment
-- gaining a p_currency parameter) never silently drops out of coverage.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/scripts/verify-payment-rpc-grants.sql
--   -- or paste into the Supabase SQL editor and run.
--
-- A "PASS" NOTICE means all clear. Any ERROR means at least one
-- service-only RPC is callable by anon/authenticated/PUBLIC, or a
-- customer-facing RPC is missing its required authenticated grant —
-- treat either as a live payment-bypass vulnerability.

DO $$
DECLARE
  v_service_only_patterns text[] := ARRAY[
    'confirm_booking_payment',
    'fail_booking_payment',
    'attach_payment_session',
    'mark_refund_processing',
    'complete_booking_refund',
    'fail_booking_refund',
    'claim_payment_webhook_event',
    'finish_payment_webhook_event',
    'calculate_commission',
    'next_invoice_number',
    'next_receipt_number'
  ];
  v_customer_facing_patterns text[] := ARRAY[
    'start_booking_payment',
    'request_booking_refund'
  ];
  v_violations text[] := ARRAY[]::text[];
  v_discovered text[] := ARRAY[]::text[];
  v_row record;
  v_identity text;
  v_anon_ok boolean;
  v_auth_ok boolean;
BEGIN
  -- ── Service-only: must be executable by service_role only. ──────
  FOR v_row IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY(v_service_only_patterns)
  LOOP
    v_identity := format('public.%I(%s)', v_row.proname, v_row.args);
    v_discovered := v_discovered || (v_identity || ' [service-only]');

    -- aclexplode-based check: any EXECUTE grant to PUBLIC (grantee=0),
    -- anon, or authenticated is a violation.
    IF EXISTS (
      SELECT 1
      FROM aclexplode(COALESCE(
        (SELECT proacl FROM pg_proc WHERE oid = v_row.oid),
        acldefault('f', (SELECT proowner FROM pg_proc WHERE oid = v_row.oid))
      )) AS acl
      WHERE acl.privilege_type = 'EXECUTE'
        AND (
          acl.grantee = 0
          OR pg_catalog.pg_get_userbyid(acl.grantee) IN ('anon', 'authenticated')
        )
    ) THEN
      v_violations := v_violations || format('%s: aclexplode shows PUBLIC/anon/authenticated EXECUTE grant', v_identity);
    END IF;

    -- has_function_privilege cross-check (authoritative, engine-native;
    -- catches anything aclexplode's role-name resolution might miss).
    EXECUTE format(
      'SELECT has_function_privilege(''anon'', %L, ''EXECUTE''), has_function_privilege(''authenticated'', %L, ''EXECUTE'')',
      v_identity, v_identity
    ) INTO v_anon_ok, v_auth_ok;

    IF v_anon_ok THEN
      v_violations := v_violations || format('%s: has_function_privilege confirms anon CAN execute', v_identity);
    END IF;
    IF v_auth_ok THEN
      v_violations := v_violations || format('%s: has_function_privilege confirms authenticated CAN execute', v_identity);
    END IF;
  END LOOP;

  -- ── Customer-facing: must be executable by authenticated, NOT anon. ──
  FOR v_row IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY(v_customer_facing_patterns)
  LOOP
    v_identity := format('public.%I(%s)', v_row.proname, v_row.args);
    v_discovered := v_discovered || (v_identity || ' [customer-facing]');

    IF EXISTS (
      SELECT 1
      FROM aclexplode(COALESCE(
        (SELECT proacl FROM pg_proc WHERE oid = v_row.oid),
        acldefault('f', (SELECT proowner FROM pg_proc WHERE oid = v_row.oid))
      )) AS acl
      WHERE acl.privilege_type = 'EXECUTE'
        AND (acl.grantee = 0 OR pg_catalog.pg_get_userbyid(acl.grantee) = 'anon')
    ) THEN
      v_violations := v_violations || format('%s: aclexplode shows PUBLIC/anon EXECUTE grant (should require authenticated)', v_identity);
    END IF;

    EXECUTE format(
      'SELECT has_function_privilege(''anon'', %L, ''EXECUTE''), has_function_privilege(''authenticated'', %L, ''EXECUTE'')',
      v_identity, v_identity
    ) INTO v_anon_ok, v_auth_ok;

    IF v_anon_ok THEN
      v_violations := v_violations || format('%s: has_function_privilege confirms anon CAN execute (should require authenticated)', v_identity);
    END IF;
    IF NOT v_auth_ok THEN
      v_violations := v_violations || format('%s: has_function_privilege confirms authenticated CANNOT execute (customer flow would break)', v_identity);
    END IF;
  END LOOP;

  IF array_length(v_discovered, 1) IS NULL OR array_length(v_discovered, 1) < (array_length(v_service_only_patterns, 1) + array_length(v_customer_facing_patterns, 1)) THEN
    RAISE WARNING E'Discovered fewer payment functions than expected patterns — some names in v_service_only_patterns/v_customer_facing_patterns may not exist yet (not necessarily an error, e.g. before their migration is applied):\n%',
      array_to_string(v_discovered, E'\n');
  END IF;

  IF array_length(v_violations, 1) > 0 THEN
    RAISE EXCEPTION E'Payment RPC grant regression detected:\n%', array_to_string(v_violations, E'\n');
  END IF;

  RAISE NOTICE E'PASS: all % discovered payment RPCs have correct grants (no PUBLIC/anon/authenticated execute on service-only functions; customer-facing functions require authenticated, not anon).\nDiscovered:\n%',
    array_length(v_discovered, 1), array_to_string(v_discovered, E'\n');
END;
$$;
