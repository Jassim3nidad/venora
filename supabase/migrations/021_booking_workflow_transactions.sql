-- ============================================================
-- Migration 021 - Complete booking workflow
-- Inquiry -> approval -> payment -> confirmation -> completion -> review
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS event_start_time time,
  ADD COLUMN IF NOT EXISTS event_end_time time,
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'deposit',
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_workflow_status
  ON public.bookings(status, payment_due_at, event_date);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_reference
  ON public.transactions(payment_provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_booking_kind
  ON public.transactions(booking_id, payment_kind, status);

COMMENT ON COLUMN public.bookings.approved_at IS
  'Venue approval timestamp. Payment is still required before confirmation.';
COMMENT ON COLUMN public.bookings.payment_due_at IS
  'Deposit deadline after venue approval. Used by expiry jobs and reminders.';
COMMENT ON COLUMN public.bookings.paid_at IS
  'Timestamp when the required deposit or booking payment was confirmed.';
COMMENT ON COLUMN public.bookings.confirmed_at IS
  'Customer-facing confirmation timestamp after payment succeeds.';
COMMENT ON COLUMN public.bookings.reviewed_at IS
  'Timestamp when the completed booking received its customer review.';
COMMENT ON COLUMN public.transactions.payment_kind IS
  'Payment purpose. Current booking workflow uses deposit; future values can include balance, refund, supplier_fee.';
COMMENT ON COLUMN public.transactions.checkout_url IS
  'Hosted checkout URL from the payment provider, when available.';

-- Keep status history append-only and include the initial inquiry state.
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
    VALUES (NEW.id, NEW.status, auth.uid(), 'Booking inquiry submitted');
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_status_history ON public.bookings;
CREATE TRIGGER bookings_status_history
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- Keep date availability synchronized with the workflow.
CREATE OR REPLACE FUNCTION public.sync_availability_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_status public.availability_status;
  has_other_active boolean;
BEGIN
  IF NEW.status::text IN ('pending', 'approved', 'payment_pending') THEN
    target_status := 'tentative';
  ELSIF NEW.status::text IN ('confirmed', 'completed', 'reviewed') THEN
    target_status := 'reserved';
  ELSE
    target_status := NULL;
  END IF;

  IF target_status IS NOT NULL THEN
    INSERT INTO public.venue_availability (venue_id, date, status)
    VALUES (NEW.venue_id, NEW.event_date, target_status)
    ON CONFLICT (venue_id, date) DO UPDATE
      SET status = EXCLUDED.status
      WHERE public.venue_availability.status NOT IN ('maintenance', 'blackout');

    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = NEW.venue_id
      AND b.event_date = NEW.event_date
      AND b.id <> NEW.id
      AND b.status::text IN (
        'pending',
        'approved',
        'payment_pending',
        'confirmed',
        'completed',
        'reviewed'
      )
  )
  INTO has_other_active;

  IF NOT has_other_active THEN
    UPDATE public.venue_availability
    SET status = 'available'
    WHERE venue_id = NEW.venue_id
      AND date = NEW.event_date
      AND status IN ('tentative', 'reserved');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_availability ON public.bookings;
CREATE TRIGGER bookings_sync_availability
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_availability_on_booking();

-- In-app notification rows for customer and venue teams.
CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  venue_name text;
  customer_title text;
  customer_body text;
  owner_title text;
  owner_body text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO venue_name
  FROM public.venues
  WHERE id = NEW.venue_id;

  CASE NEW.status::text
    WHEN 'pending' THEN
      customer_title := 'Booking inquiry sent';
      customer_body := 'Your inquiry for ' || COALESCE(venue_name, 'this venue') || ' is awaiting venue approval.';
      owner_title := 'New booking inquiry';
      owner_body := 'A customer requested ' || COALESCE(venue_name, 'your venue') || ' for ' || NEW.event_date::text || '.';
    WHEN 'approved' THEN
      customer_title := 'Venue approved your request';
      customer_body := 'Your quote is ready. Pay the deposit to confirm your booking.';
      owner_title := 'Booking approved';
      owner_body := 'The customer has been notified to pay the required deposit.';
    WHEN 'payment_pending' THEN
      customer_title := 'Payment started';
      customer_body := 'Your deposit payment is pending confirmation from the payment provider.';
      owner_title := 'Payment pending';
      owner_body := 'The customer started payment for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'confirmed' THEN
      customer_title := 'Booking confirmed';
      customer_body := 'Payment was received and your venue booking is confirmed.';
      owner_title := 'Booking confirmed';
      owner_body := 'Payment was received and the booking is confirmed.';
    WHEN 'declined' THEN
      customer_title := 'Booking request declined';
      customer_body := COALESCE(NEW.decline_reason, 'The venue declined this request.');
      owner_title := 'Booking declined';
      owner_body := 'The customer has been notified.';
    WHEN 'cancelled' THEN
      customer_title := 'Booking cancelled';
      customer_body := 'This booking has been cancelled.';
      owner_title := 'Booking cancelled';
      owner_body := 'This booking has been cancelled.';
    WHEN 'completed' THEN
      customer_title := 'Event completed';
      customer_body := 'Your event is complete. Share a review to help future customers.';
      owner_title := 'Booking completed';
      owner_body := 'The booking was marked complete and is ready for review.';
    WHEN 'reviewed' THEN
      customer_title := 'Review submitted';
      customer_body := 'Thanks for reviewing ' || COALESCE(venue_name, 'your venue') || '.';
      owner_title := 'New venue review';
      owner_body := 'A customer submitted a review for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'expired' THEN
      customer_title := 'Booking request expired';
      customer_body := 'This request expired before it was confirmed.';
      owner_title := 'Booking expired';
      owner_body := 'A booking request expired automatically.';
    ELSE
      customer_title := NULL;
      owner_title := NULL;
  END CASE;

  IF customer_title IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, channel, title, body, link)
    VALUES (
      NEW.customer_id,
      'in_app',
      customer_title,
      customer_body,
      '/bookings/' || NEW.id::text
    );
  END IF;

  IF owner_title IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, channel, title, body, link)
    SELECT DISTINCT om.user_id, 'in_app', owner_title, owner_body, '/dashboard/bookings/' || NEW.id::text
    FROM public.venues v
    JOIN public.organization_members om ON om.organization_id = v.organization_id
    WHERE v.id = NEW.venue_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_status_notifications ON public.bookings;
CREATE TRIGGER bookings_status_notifications
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_booking_status_notifications();

-- Customer inquiry transaction. This is the only supported customer-created booking path.
CREATE OR REPLACE FUNCTION public.create_booking_inquiry(
  p_venue_id uuid,
  p_package_id uuid,
  p_event_date date,
  p_guest_count int,
  p_special_requests text DEFAULT NULL,
  p_event_start_time time DEFAULT NULL,
  p_event_end_time time DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_venue public.venues%ROWTYPE;
  v_package public.venue_packages%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_availability public.venue_availability%ROWTYPE;
  v_has_conflict boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a booking inquiry';
  END IF;

  SELECT * INTO v_venue
  FROM public.venues
  WHERE id = p_venue_id
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This venue is not available for booking';
  END IF;

  IF p_event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date must be today or later';
  END IF;

  IF p_guest_count < COALESCE(v_venue.capacity_min, 1)
     OR p_guest_count > v_venue.capacity_max THEN
    RAISE EXCEPTION 'Guest count is outside this venue capacity';
  END IF;

  IF p_package_id IS NOT NULL THEN
    SELECT * INTO v_package
    FROM public.venue_packages
    WHERE id = p_package_id
      AND venue_id = p_venue_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected package is not available for this venue';
    END IF;

    IF v_package.min_guests IS NOT NULL AND p_guest_count < v_package.min_guests THEN
      RAISE EXCEPTION 'Guest count is below the selected package minimum';
    END IF;

    IF v_package.max_guests IS NOT NULL AND p_guest_count > v_package.max_guests THEN
      RAISE EXCEPTION 'Guest count exceeds the selected package maximum';
    END IF;
  END IF;

  SELECT * INTO v_availability
  FROM public.venue_availability
  WHERE venue_id = p_venue_id
    AND date = p_event_date;

  IF FOUND AND v_availability.status IN ('reserved', 'maintenance', 'blackout') THEN
    RAISE EXCEPTION 'This venue is unavailable on the selected date';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = p_venue_id
      AND b.event_date = p_event_date
      AND b.status::text IN (
        'pending',
        'approved',
        'payment_pending',
        'confirmed',
        'completed',
        'reviewed'
      )
  )
  INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'This venue already has an active booking for the selected date';
  END IF;

  INSERT INTO public.bookings (
    venue_id,
    customer_id,
    package_id,
    event_date,
    event_start_time,
    event_end_time,
    guest_count,
    status,
    special_requests
  )
  VALUES (
    p_venue_id,
    v_user_id,
    p_package_id,
    p_event_date,
    p_event_start_time,
    p_event_end_time,
    p_guest_count,
    'pending',
    NULLIF(BTRIM(p_special_requests), '')
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_booking_quote(
  p_booking_id uuid,
  p_total_amount numeric,
  p_deposit_amount numeric DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_deposit numeric;
BEGIN
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to approve this booking';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be approved';
  END IF;

  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be greater than zero';
  END IF;

  v_deposit := COALESCE(p_deposit_amount, ROUND(p_total_amount * 0.5, 2));

  IF v_deposit <= 0 OR v_deposit > p_total_amount THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero and not exceed the total amount';
  END IF;

  UPDATE public.bookings
  SET status = 'approved',
      total_amount = p_total_amount,
      deposit_amount = v_deposit,
      approval_note = NULLIF(BTRIM(p_note), ''),
      approved_at = now(),
      payment_due_at = now() + INTERVAL '48 hours',
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_booking_request(
  p_booking_id uuid,
  p_reason text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to decline this booking';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be declined';
  END IF;

  UPDATE public.bookings
  SET status = 'declined',
      decline_reason = NULLIF(BTRIM(p_reason), ''),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_request(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_is_customer boolean;
  v_is_owner boolean;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_is_customer := v_booking.customer_id = v_user_id;
  v_is_owner := public.is_org_member_for_booking(p_booking_id) OR public.is_admin();

  IF NOT (v_is_customer OR v_is_owner) THEN
    RAISE EXCEPTION 'You do not have permission to cancel this booking';
  END IF;

  IF v_booking.status::text NOT IN ('pending', 'approved', 'payment_pending', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      decline_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), decline_reason),
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_booking_payment(
  p_booking_id uuid,
  p_payment_provider public.payment_provider,
  p_checkout_url text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the booking customer can start payment';
  END IF;

  IF v_booking.status::text NOT IN ('approved', 'payment_pending') THEN
    RAISE EXCEPTION 'This booking is not ready for payment';
  END IF;

  IF v_booking.deposit_amount IS NULL OR v_booking.deposit_amount <= 0 THEN
    RAISE EXCEPTION 'This booking has no payable deposit amount';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND payment_kind = 'deposit'
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_transaction;
  END IF;

  INSERT INTO public.transactions (
    booking_id,
    amount,
    payment_provider,
    provider_reference,
    status,
    checkout_url,
    payment_kind,
    currency,
    metadata
  )
  VALUES (
    p_booking_id,
    v_booking.deposit_amount,
    p_payment_provider,
    p_provider_reference,
    'pending',
    NULLIF(BTRIM(p_checkout_url), ''),
    'deposit',
    'PHP',
    jsonb_build_object('booking_status_before_payment', v_booking.status::text)
  )
  RETURNING * INTO v_transaction;

  UPDATE public.bookings
  SET status = 'payment_pending',
      payment_started_at = COALESCE(payment_started_at, now()),
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id uuid,
  p_payment_provider public.payment_provider,
  p_provider_reference text,
  p_amount numeric DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_amount numeric;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text IN ('confirmed', 'completed', 'reviewed') THEN
    RETURN v_booking;
  END IF;

  IF v_booking.status::text NOT IN ('approved', 'payment_pending') THEN
    RAISE EXCEPTION 'This booking is not payable';
  END IF;

  v_amount := COALESCE(p_amount, v_booking.deposit_amount);

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND payment_kind = 'deposit'
    AND (
      provider_reference = p_provider_reference
      OR (provider_reference IS NULL AND status = 'pending')
    )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.transactions
    SET status = 'paid',
        amount = v_amount,
        payment_provider = p_payment_provider,
        provider_reference = p_provider_reference,
        paid_at = now(),
        metadata = metadata || jsonb_build_object('confirmed_by', 'payment_webhook')
    WHERE id = v_transaction.id;
  ELSE
    INSERT INTO public.transactions (
      booking_id,
      amount,
      payment_provider,
      provider_reference,
      status,
      payment_kind,
      currency,
      paid_at,
      metadata
    )
    VALUES (
      p_booking_id,
      v_amount,
      p_payment_provider,
      p_provider_reference,
      'paid',
      'deposit',
      'PHP',
      now(),
      jsonb_build_object('confirmed_by', 'payment_webhook')
    );
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed',
      paid_at = now(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_booking_payment(
  p_booking_id uuid,
  p_payment_provider public.payment_provider,
  p_provider_reference text,
  p_failure_reason text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  UPDATE public.transactions
  SET status = 'failed',
      payment_provider = p_payment_provider,
      provider_reference = COALESCE(provider_reference, p_provider_reference),
      failed_at = now(),
      failure_reason = NULLIF(BTRIM(p_failure_reason), '')
  WHERE booking_id = p_booking_id
    AND payment_kind = 'deposit'
    AND status = 'pending';

  UPDATE public.bookings
  SET status = 'approved',
      updated_at = now()
  WHERE id = p_booking_id
    AND status::text = 'payment_pending'
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  END IF;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_booking_event(
  p_booking_id uuid
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_org_id uuid;
  v_paid_amount numeric;
  v_commission_amount numeric;
BEGIN
  IF NOT (public.is_org_member_for_booking(p_booking_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to complete this booking';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status::text <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bookings can be completed';
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  SELECT v.organization_id INTO v_org_id
  FROM public.venues v
  WHERE v.id = v_booking.venue_id;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(commission_amount), 0)
  INTO v_paid_amount, v_commission_amount
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND status = 'paid';

  IF v_org_id IS NOT NULL AND v_paid_amount > 0 THEN
    INSERT INTO public.payouts (organization_id, amount, status, scheduled_at)
    SELECT v_org_id, GREATEST(v_paid_amount - v_commission_amount, 0), 'scheduled', now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payouts p
      WHERE p.organization_id = v_org_id
        AND p.scheduled_at IS NOT NULL
        AND p.amount = GREATEST(v_paid_amount - v_commission_amount, 0)
    );
  END IF;

  RETURN v_booking;
END;
$$;

-- Customer review submission moves the workflow to reviewed.
CREATE OR REPLACE FUNCTION public.mark_booking_reviewed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'reviewed',
      reviewed_at = now(),
      updated_at = now()
  WHERE id = NEW.booking_id
    AND status::text = 'completed';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_mark_booking_reviewed ON public.reviews;
CREATE TRIGGER reviews_mark_booking_reviewed
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.mark_booking_reviewed();

-- Expire unpaid approved/payment-pending bookings after the payment deadline.
SELECT cron.schedule(
  'expire-approved-unpaid-bookings',
  '*/30 * * * *',
  $$
    UPDATE public.bookings
    SET status = 'expired', updated_at = now()
    WHERE status::text IN ('approved', 'payment_pending')
      AND payment_due_at IS NOT NULL
      AND payment_due_at < now();
  $$
);

REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) TO service_role;
