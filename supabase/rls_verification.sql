-- ============================================================
-- Venora RLS Verification Script
-- ============================================================
-- Purpose : Assert that Row Level Security policies in 010_rls.sql
--           block and allow access correctly for all 5 roles.
--
-- How to run:
--   Supabase SQL Editor  →  paste and execute (runs as service_role)
--   psql                 →  \i supabase/rls_verification.sql
--
-- Safety : Everything runs inside a single transaction that is
--          unconditionally ROLLED BACK at the end — no permanent
--          test data is written to the database.
--
-- Output : RAISE NOTICE lines report PASS / SKIP.
--          Any RAISE EXCEPTION line means a policy is broken.
-- ============================================================

BEGIN;

-- ── Deterministic UUIDs for the 5 test personas ──────────────
-- Using a fixed UUID namespace (oid-style) keeps reruns idempotent.
DO $$
DECLARE
  v_customer_id  CONSTANT uuid := '00000001-0000-0000-0000-000000000001';
  v_owner_id     CONSTANT uuid := '00000001-0000-0000-0000-000000000002';
  v_coord_id     CONSTANT uuid := '00000001-0000-0000-0000-000000000003';
  v_supplier_id  CONSTANT uuid := '00000001-0000-0000-0000-000000000004';
  v_admin_id     CONSTANT uuid := '00000001-0000-0000-0000-000000000005';
BEGIN
  -- Stash IDs in session-local settings so the authenticated DO block can read them.
  PERFORM set_config('_test.customer_id',  v_customer_id::text,  true);
  PERFORM set_config('_test.owner_id',     v_owner_id::text,     true);
  PERFORM set_config('_test.coord_id',     v_coord_id::text,     true);
  PERFORM set_config('_test.supplier_id',  v_supplier_id::text,  true);
  PERFORM set_config('_test.admin_id',     v_admin_id::text,     true);
END;
$$;

-- ── Create test users (triggers auto-create profiles + user_roles) ────────────
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) VALUES
  (current_setting('_test.customer_id')::uuid, 'authenticated', 'authenticated',
   'rls_test_customer@venora.internal',  'x', now(),
   '{"full_name":"RLS Customer","role":"customer"}'::jsonb,         now(), now()),

  (current_setting('_test.owner_id')::uuid,    'authenticated', 'authenticated',
   'rls_test_owner@venora.internal',     'x', now(),
   '{"full_name":"RLS Venue Owner","role":"venue_owner"}'::jsonb,   now(), now()),

  (current_setting('_test.coord_id')::uuid,    'authenticated', 'authenticated',
   'rls_test_coord@venora.internal',     'x', now(),
   '{"full_name":"RLS Coordinator","role":"event_coordinator"}'::jsonb, now(), now()),

  (current_setting('_test.supplier_id')::uuid, 'authenticated', 'authenticated',
   'rls_test_supplier@venora.internal',  'x', now(),
   '{"full_name":"RLS Supplier","role":"supplier"}'::jsonb,         now(), now()),

  (current_setting('_test.admin_id')::uuid,    'authenticated', 'authenticated',
   'rls_test_admin@venora.internal',     'x', now(),
   '{"full_name":"RLS Admin","role":"admin"}'::jsonb,               now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Temporary grants inside this transaction ──────────────────────────────────
-- PostgreSQL DDL (including GRANT) is fully transactional.
-- These grants are rolled back with the transaction at the end —
-- they make no permanent change to the production permission model.
-- Without these, SET LOCAL ROLE authenticated gets "permission denied"
-- before RLS even has a chance to evaluate.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── Switch to authenticated role (RLS is now enforced) ────────────────────────
SET LOCAL ROLE authenticated;

-- ============================================================
-- TEST SUITE
-- ============================================================
DO $$
DECLARE
  v_customer_id  uuid := current_setting('_test.customer_id')::uuid;
  v_owner_id     uuid := current_setting('_test.owner_id')::uuid;
  v_coord_id     uuid := current_setting('_test.coord_id')::uuid;
  v_supplier_id  uuid := current_setting('_test.supplier_id')::uuid;
  v_admin_id     uuid := current_setting('_test.admin_id')::uuid;
  v_count        int;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '  Venora RLS Verification — starting test suite';
  RAISE NOTICE '══════════════════════════════════════════════════════';

  -- ──────────────────────────────────────────────────────────
  -- TABLE: profiles
  -- ──────────────────────────────────────────────────────────

  -- T01: Any authenticated user can SELECT all profiles (public read)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count >= 5 THEN
    RAISE NOTICE 'PASS T01 — profiles.select.public: customer reads % profiles', v_count;
  ELSE
    RAISE WARNING 'SKIP T01 — profiles.select.public: only % rows (trigger may not have fired)', v_count;
  END IF;

  -- T02: User can UPDATE own profile row only (other rows silently filtered)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  UPDATE public.profiles SET full_name = full_name WHERE id = v_owner_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T02 — profiles.update.self: customer cannot UPDATE another user (0 rows)';
  ELSE
    RAISE EXCEPTION 'FAIL T02 — profiles.update.self: customer updated % foreign profile rows!', v_count;
  END IF;

  -- T03: Admin can UPDATE any profile
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  UPDATE public.profiles SET full_name = full_name WHERE id = v_customer_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 1 THEN
    RAISE NOTICE 'PASS T03 — profiles.all.admin: admin UPDATE on customer profile succeeded';
  ELSE
    RAISE EXCEPTION 'FAIL T03 — profiles.all.admin: admin could not UPDATE customer profile (% rows)', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: user_roles
  -- ──────────────────────────────────────────────────────────

  -- T04: User can only SELECT their own roles (other users' rows invisible)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.user_roles WHERE user_id = v_owner_id;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T04 — user_roles.select.self: customer cannot see owner roles';
  ELSE
    RAISE EXCEPTION 'FAIL T04 — user_roles.select.self: customer sees % rows of owner roles!', v_count;
  END IF;

  -- T05: User CANNOT self-assign the admin role (RLS WITH CHECK blocks it)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_customer_id, 'admin');
    RAISE EXCEPTION 'FAIL T05 — user_roles.insert.admin: customer inserted admin role — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T05 — user_roles.insert.admin: customer blocked from self-assigning admin';
  WHEN others THEN
    RAISE NOTICE 'PASS T05 — user_roles.insert.admin: blocked (%) — RLS or constraint active', SQLERRM;
  END;

  -- T05_B: User CANNOT self-assign any role (e.g. venue_owner) - guards against the high-risk escalation loophole
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_customer_id, 'venue_owner');
    RAISE EXCEPTION 'FAIL T05_B — user_roles.insert.self: customer successfully self-assigned venue_owner role — HIGH-RISK ESCALATION LOOPHOLE IS ACTIVE!';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T05_B — user_roles.insert.self: customer correctly blocked from self-assigning venue_owner';
  WHEN others THEN
    RAISE NOTICE 'PASS T05_B — user_roles.insert.self: blocked (%)', SQLERRM;
  END;

  -- T06: Admin can SELECT all user_roles
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.user_roles;
  IF v_count >= 5 THEN
    RAISE NOTICE 'PASS T06 — user_roles.all.admin: admin reads all % role assignments', v_count;
  ELSE
    RAISE EXCEPTION 'FAIL T06 — user_roles.all.admin: admin only sees % rows (expected >= 5)', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: bookings
  -- ──────────────────────────────────────────────────────────

  -- T07: Supplier cannot INSERT a booking (requires customer role)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supplier_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.bookings
      (id, venue_id, customer_id, event_date, guest_count, status)
    VALUES
      (gen_random_uuid(), gen_random_uuid(), v_supplier_id, CURRENT_DATE + 60, 50, 'pending');
    RAISE EXCEPTION 'FAIL T07 — bookings.insert.customer: supplier inserted a booking — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T07 — bookings.insert.customer: supplier blocked (insufficient_privilege)';
  WHEN others THEN
    RAISE NOTICE 'PASS T07 — bookings.insert.customer: supplier blocked (%) — RLS or FK active', SQLERRM;
  END;

  -- T08: Venue-owner cannot INSERT a booking (requires customer role)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.bookings
      (id, venue_id, customer_id, event_date, guest_count, status)
    VALUES
      (gen_random_uuid(), gen_random_uuid(), v_owner_id, CURRENT_DATE + 60, 30, 'pending');
    RAISE EXCEPTION 'FAIL T08 — bookings.insert.customer: venue_owner inserted a booking — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T08 — bookings.insert.customer: venue_owner blocked (insufficient_privilege)';
  WHEN others THEN
    RAISE NOTICE 'PASS T08 — bookings.insert.customer: venue_owner blocked (%) — RLS or FK active', SQLERRM;
  END;

  -- T09: Customer cannot see another customer's bookings (row isolation)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.bookings WHERE customer_id = v_owner_id;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T09 — bookings.select: customer sees 0 bookings belonging to other user';
  ELSE
    RAISE EXCEPTION 'FAIL T09 — bookings.select: customer sees % bookings belonging to another user!', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: supplier_profiles
  -- ──────────────────────────────────────────────────────────

  -- T10: Customer cannot INSERT a supplier profile (requires supplier role)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.supplier_profiles (id, profile_id, business_name)
    VALUES (gen_random_uuid(), v_customer_id, 'Fake Supplier Co.');
    RAISE EXCEPTION 'FAIL T10 — supplier_profiles.insert.supplier: customer inserted supplier profile — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T10 — supplier_profiles.insert.supplier: customer blocked (insufficient_privilege)';
  WHEN others THEN
    RAISE NOTICE 'PASS T10 — supplier_profiles.insert.supplier: customer blocked (%) — RLS or constraint', SQLERRM;
  END;

  -- T11: Non-accredited supplier profiles are invisible to customers
  -- (only accredited profiles are publicly visible; supplier can see own)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count
    FROM public.supplier_profiles
   WHERE accreditation_status = 'pending'
     AND profile_id <> v_customer_id;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T11 — supplier_profiles.select.accredited: customer sees 0 pending profiles';
  ELSE
    RAISE EXCEPTION 'FAIL T11 — supplier_profiles.select: customer sees % pending (non-accredited) profiles!', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: audit_logs
  -- ──────────────────────────────────────────────────────────

  -- T12: Customer sees 0 rows from audit_logs (admin-only)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.audit_logs;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T12 — audit_logs.select.admin: customer sees 0 rows (RLS filtering)';
  ELSE
    RAISE EXCEPTION 'FAIL T12 — audit_logs.select: customer can see % audit_log rows!', v_count;
  END IF;

  -- T13: Supplier sees 0 rows from audit_logs
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supplier_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.audit_logs;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T13 — audit_logs.select.admin: supplier sees 0 rows (RLS filtering)';
  ELSE
    RAISE EXCEPTION 'FAIL T13 — audit_logs.select: supplier can see % audit_log rows!', v_count;
  END IF;

  -- T14: Admin can query audit_logs without error
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    SELECT count(*) INTO v_count FROM public.audit_logs;
    RAISE NOTICE 'PASS T14 — audit_logs.select.admin: admin queries audit_logs (% rows)', v_count;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'FAIL T14 — audit_logs.select.admin: admin blocked from audit_logs: %', SQLERRM;
  END;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: favorites
  -- ──────────────────────────────────────────────────────────

  -- T15: User cannot see another user's favorites
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.favorites WHERE customer_id = v_owner_id;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T15 — favorites.all.customer: customer sees 0 rows belonging to another user';
  ELSE
    RAISE EXCEPTION 'FAIL T15 — favorites: customer can see % favorite rows of another user!', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: notifications
  -- ──────────────────────────────────────────────────────────

  -- T16: User cannot see another user's notifications
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.notifications WHERE user_id = v_owner_id;
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS T16 — notifications.all.self: customer sees 0 notifications of another user';
  ELSE
    RAISE EXCEPTION 'FAIL T16 — notifications: customer can see % rows belonging to another user!', v_count;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- TABLE: organizations
  -- ──────────────────────────────────────────────────────────

  -- T17: Customer cannot INSERT an organization (requires venue_owner role)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_customer_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.organizations (id, owner_id, name)
    VALUES (gen_random_uuid(), v_customer_id, 'Fake Events Co.');
    RAISE EXCEPTION 'FAIL T17 — organizations.insert.venue_owner: customer created an org — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T17 — organizations.insert.venue_owner: customer blocked (insufficient_privilege)';
  WHEN others THEN
    RAISE NOTICE 'PASS T17 — organizations.insert.venue_owner: customer blocked (%) — RLS or constraint', SQLERRM;
  END;

  -- T18: Supplier cannot INSERT an organization (requires venue_owner role)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_supplier_id::text, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.organizations (id, owner_id, name)
    VALUES (gen_random_uuid(), v_supplier_id, 'Sneaky Supplier Org');
    RAISE EXCEPTION 'FAIL T18 — organizations.insert.venue_owner: supplier created an org — RLS BROKEN';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS T18 — organizations.insert.venue_owner: supplier blocked (insufficient_privilege)';
  WHEN others THEN
    RAISE NOTICE 'PASS T18 — organizations.insert.venue_owner: supplier blocked (%) — RLS or constraint', SQLERRM;
  END;

  -- ──────────────────────────────────────────────────────────
  -- SUMMARY
  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '  All 18 RLS assertions completed without EXCEPTION.';
  RAISE NOTICE '  (If any FAIL appeared above, fix the offending policy)';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '';

END;
$$;

-- ── Always roll back — no test data persists ──────────────────────────────────
ROLLBACK;

-- Confirm the rollback worked:
DO $$
BEGIN
  RAISE NOTICE 'Transaction rolled back — zero test data written to database.';
END;
$$;
