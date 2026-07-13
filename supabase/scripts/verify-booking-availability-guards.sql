-- Booking availability guard verification.
--
-- Run after applying migrations:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/verify-booking-availability-guards.sql
--
-- Requires permission to seed auth.users and SET LOCAL ROLE authenticated.
-- Uses fixed test IDs inside one transaction and rolls back.

BEGIN;

DO $$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES
    (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'availability-customer@example.test',
      crypt('password', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Availability Customer","role":"customer"}'::jsonb
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'availability-owner@example.test',
      crypt('password', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Availability Owner","role":"venue_owner"}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, status)
  VALUES
    ('10000000-0000-4000-8000-000000000001', 'Availability Customer', 'active'),
    ('10000000-0000-4000-8000-000000000002', 'Availability Owner', 'active')
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    ('10000000-0000-4000-8000-000000000001', 'customer'),
    ('10000000-0000-4000-8000-000000000002', 'venue_owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organizations (id, owner_id, name)
  VALUES (
    '10000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000002',
    'Availability Verification Org'
  )
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (
    '10000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000002',
    'owner'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.venues (
    id,
    organization_id,
    name,
    slug,
    province,
    city,
    address,
    capacity_min,
    capacity_max,
    base_price,
    status
  )
  VALUES (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000010',
    'Availability Verification Venue',
    'availability-verification-venue',
    'Metro Manila',
    'Makati',
    'Verification Street',
    1,
    300,
    100000,
    'published'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  v_booking public.bookings;
  v_second public.bookings;
  v_start_date date := CURRENT_DATE + 45;
  v_move_date date := CURRENT_DATE + 46;
  v_rows integer;
  v_status text;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.create_booking_inquiry(
    '10000000-0000-4000-8000-000000000020',
    NULL,
    v_start_date,
    25,
    'Verification booking',
    NULL,
    NULL
  );

  IF v_booking.status <> 'pending' THEN
    RAISE EXCEPTION 'Expected first booking to be pending, got %', v_booking.status;
  END IF;

  BEGIN
    SELECT *
    INTO v_second
    FROM public.create_booking_inquiry(
      '10000000-0000-4000-8000-000000000020',
      NULL,
      v_start_date,
      25,
      'Duplicate booking',
      NULL,
      NULL
    );
    RAISE EXCEPTION 'Expected duplicate active booking to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%active booking%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO public.bookings (
      venue_id,
      customer_id,
      event_date,
      guest_count,
      status
    )
    VALUES (
      '10000000-0000-4000-8000-000000000020',
      '10000000-0000-4000-8000-000000000001',
      v_move_date,
      25,
      'pending'
    );
    RAISE EXCEPTION 'Expected direct customer booking insert to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%row-level security%'
       AND SQLERRM NOT ILIKE '%permission denied%' THEN
      RAISE;
    END IF;
  END;

  UPDATE public.bookings
  SET event_date = v_move_date
  WHERE id = v_booking.id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    RAISE EXCEPTION 'Expected direct customer booking update to be denied';
  END IF;

  SELECT public.cancel_booking_request(v_booking.id, 'verification release')
  INTO v_booking;

  SELECT status::text
  INTO v_status
  FROM public.venue_availability
  WHERE venue_id = '10000000-0000-4000-8000-000000000020'
    AND date = v_start_date;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'Expected cancelled booking to release date, got %', v_status;
  END IF;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  v_second public.bookings;
  v_blocked_date date := CURRENT_DATE + 47;
  v_status text;
BEGIN
  FOREACH v_status IN ARRAY ARRAY['tentative', 'maintenance', 'blackout', 'reserved']
  LOOP
    INSERT INTO public.venue_availability (venue_id, date, status)
    VALUES (
      '10000000-0000-4000-8000-000000000020',
      v_blocked_date,
      v_status::public.availability_status
    )
    ON CONFLICT (venue_id, date) DO UPDATE SET status = EXCLUDED.status;

    BEGIN
      SELECT *
      INTO v_second
      FROM public.create_booking_inquiry(
        '10000000-0000-4000-8000-000000000020',
        NULL,
        v_blocked_date,
        25,
        'Blocked booking',
        NULL,
        NULL
      );
      RAISE EXCEPTION 'Expected booking on % date to fail', v_status;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%unavailable%' THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  v_booking public.bookings;
  v_booking_id uuid;
  v_start_date date := CURRENT_DATE + 48;
  v_move_date date := CURRENT_DATE + 49;
  v_status text;
BEGIN
  UPDATE public.venue_availability
  SET status = 'available'
  WHERE venue_id = '10000000-0000-4000-8000-000000000020'
    AND date IN (v_start_date, v_move_date);

  SELECT *
  INTO v_booking
  FROM public.create_booking_inquiry(
    '10000000-0000-4000-8000-000000000020',
    NULL,
    v_start_date,
    25,
    'Move verification',
    NULL,
    NULL
  );

  v_booking_id := v_booking.id;

  UPDATE public.bookings
  SET event_date = v_move_date
  WHERE id = v_booking_id;

  SELECT status::text
  INTO v_status
  FROM public.venue_availability
  WHERE venue_id = '10000000-0000-4000-8000-000000000020'
    AND date = v_start_date;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'Expected moved booking to release previous date, got %', v_status;
  END IF;

  INSERT INTO public.venue_availability (venue_id, date, status)
  VALUES (
    '10000000-0000-4000-8000-000000000020',
    v_start_date,
    'blackout'
  )
  ON CONFLICT (venue_id, date) DO UPDATE SET status = EXCLUDED.status;

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = v_booking_id;

  BEGIN
    UPDATE public.bookings
    SET status = 'pending',
        event_date = v_start_date
    WHERE id = v_booking_id;
    RAISE EXCEPTION 'Expected inactive-to-active update on blackout date to fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%unavailable%' THEN
      RAISE;
    END IF;
  END;
END $$;

-- True concurrent verification needs two sessions. The advisory lock in
-- assert_booking_slot_available() serializes those attempts; the duplicate
-- active booking assertion above verifies the committed-state invariant.

ROLLBACK;
