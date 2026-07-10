-- ============================================================
-- Migration 038 - Payments platform
-- Real provider checkout (PayMongo first, Maya/Stripe later),
-- refunds, invoices, receipts, webhook idempotency, commission
-- capture, and payment audit logging.
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────

CREATE TYPE public.refund_status AS ENUM (
  'pending',      -- requested, not yet sent to the provider
  'processing',   -- sent to provider, awaiting webhook confirmation
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TYPE public.invoice_status AS ENUM (
  'issued',
  'paid',
  'void',
  'refunded'
);

-- ── refunds ───────────────────────────────────────────────────

CREATE TABLE public.refunds (
  id                 uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid                    NOT NULL REFERENCES public.bookings(id),
  transaction_id     uuid                    NOT NULL REFERENCES public.transactions(id),
  amount             numeric(12,2)           NOT NULL CHECK (amount > 0),
  currency           text                    NOT NULL DEFAULT 'PHP',
  status             public.refund_status    NOT NULL DEFAULT 'pending',
  reason             text,
  requested_by       uuid                    REFERENCES public.profiles(id),
  payment_provider   public.payment_provider NOT NULL,
  provider_reference text,                   -- provider refund id (PayMongo ref_...)
  failure_reason     text,
  processed_at       timestamptz,
  metadata           jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz             NOT NULL DEFAULT now(),
  updated_at         timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_booking ON public.refunds(booking_id);
CREATE INDEX idx_refunds_status  ON public.refunds(status, created_at);
CREATE UNIQUE INDEX idx_refunds_provider_reference
  ON public.refunds(payment_provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
-- Only one in-flight refund per transaction.
CREATE UNIQUE INDEX idx_refunds_active_per_transaction
  ON public.refunds(transaction_id)
  WHERE status IN ('pending', 'processing');

COMMENT ON TABLE public.refunds IS
  'Refund requests against paid transactions. Lifecycle: pending -> processing -> succeeded/failed.';

-- ── invoices ──────────────────────────────────────────────────

CREATE SEQUENCE public.invoice_number_seq;

CREATE TABLE public.invoices (
  id              uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text                  NOT NULL UNIQUE,
  booking_id      uuid                  NOT NULL REFERENCES public.bookings(id),
  customer_id     uuid                  NOT NULL REFERENCES public.profiles(id),
  organization_id uuid                  REFERENCES public.organizations(id),
  status          public.invoice_status NOT NULL DEFAULT 'issued',
  currency        text                  NOT NULL DEFAULT 'PHP',
  line_items      jsonb                 NOT NULL DEFAULT '[]'::jsonb,
  total_amount    numeric(12,2)         NOT NULL CHECK (total_amount > 0),
  amount_due      numeric(12,2)         NOT NULL CHECK (amount_due >= 0),
  amount_paid     numeric(12,2)         NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  issued_at       timestamptz           NOT NULL DEFAULT now(),
  due_at          timestamptz,
  paid_at         timestamptz,
  voided_at       timestamptz,
  metadata        jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz           NOT NULL DEFAULT now(),
  updated_at      timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_booking  ON public.invoices(booking_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id, created_at DESC);
CREATE INDEX idx_invoices_org      ON public.invoices(organization_id, created_at DESC);
-- One open (issued) invoice per booking at a time.
CREATE UNIQUE INDEX idx_invoices_open_per_booking
  ON public.invoices(booking_id)
  WHERE status = 'issued';

COMMENT ON TABLE public.invoices IS
  'Customer-facing invoices. The deposit invoice is issued automatically when a booking is approved.';
COMMENT ON COLUMN public.invoices.line_items IS
  'Array of { description, quantity, unit_amount, amount } in the invoice currency.';

-- ── receipts ──────────────────────────────────────────────────

CREATE SEQUENCE public.receipt_number_seq;

CREATE TABLE public.receipts (
  id                 uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number     text                    NOT NULL UNIQUE,
  invoice_id         uuid                    REFERENCES public.invoices(id),
  transaction_id     uuid                    NOT NULL UNIQUE REFERENCES public.transactions(id),
  booking_id         uuid                    NOT NULL REFERENCES public.bookings(id),
  customer_id        uuid                    NOT NULL REFERENCES public.profiles(id),
  amount             numeric(12,2)           NOT NULL CHECK (amount > 0),
  currency           text                    NOT NULL DEFAULT 'PHP',
  payment_provider   public.payment_provider NOT NULL,
  provider_reference text,
  issued_at          timestamptz             NOT NULL DEFAULT now(),
  metadata           jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_booking  ON public.receipts(booking_id);
CREATE INDEX idx_receipts_customer ON public.receipts(customer_id, created_at DESC);

COMMENT ON TABLE public.receipts IS
  'Immutable proof-of-payment records, issued when a transaction is confirmed paid.';

-- ── payment_webhook_events ────────────────────────────────────
-- Idempotency ledger: every provider webhook is claimed exactly once.

CREATE TABLE public.payment_webhook_events (
  id           uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     public.payment_provider NOT NULL,
  event_id     text                    NOT NULL,
  event_type   text                    NOT NULL,
  payload      jsonb                   NOT NULL,
  status       text                    NOT NULL DEFAULT 'processing'
               CHECK (status IN ('processing', 'processed', 'failed', 'skipped')),
  error        text,
  received_at  timestamptz             NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_payment_webhook_events_status
  ON public.payment_webhook_events(status, received_at DESC);

COMMENT ON TABLE public.payment_webhook_events IS
  'Raw provider webhook events. UNIQUE(provider, event_id) guarantees at-most-once processing.';

-- ── Document number generators ────────────────────────────────

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'INV-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'RCPT-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;

-- ── updated_at maintenance ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER refunds_touch_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER invoices_touch_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Commission resolution ─────────────────────────────────────
-- Most specific active rule wins: venue > category > global.
-- percentage and flat_fee combine when both are set on the rule.

CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_venue_id uuid,
  p_amount   numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.commission_rules%ROWTYPE;
  v_commission numeric := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  SELECT cr.* INTO v_rule
  FROM public.commission_rules cr
  LEFT JOIN public.venue_category_assignments vca
    ON vca.venue_id = p_venue_id AND cr.scope = 'category' AND cr.reference_id = vca.category_id
  WHERE cr.effective_from <= CURRENT_DATE
    AND (cr.effective_to IS NULL OR cr.effective_to >= CURRENT_DATE)
    AND (
      (cr.scope = 'venue' AND cr.reference_id = p_venue_id)
      OR (cr.scope = 'category' AND vca.venue_id IS NOT NULL)
      OR (cr.scope = 'global' AND cr.reference_id IS NULL)
    )
  ORDER BY CASE cr.scope WHEN 'venue' THEN 0 WHEN 'category' THEN 1 ELSE 2 END,
           cr.effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_commission := COALESCE(p_amount * v_rule.percentage / 100.0, 0)
                + COALESCE(v_rule.flat_fee, 0);

  RETURN LEAST(ROUND(v_commission, 2), p_amount);
END;
$$;

-- ── Invoice issuance on approval ──────────────────────────────

CREATE OR REPLACE FUNCTION public.issue_deposit_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_venue_name text;
BEGIN
  IF NEW.status::text <> 'approved'
     OR NEW.deposit_amount IS NULL
     OR NEW.deposit_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- OLD is only assigned for UPDATE; keep this check in its own branch.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status::text = 'approved' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Skip when an open invoice already exists (re-approval edge case).
  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE booking_id = NEW.id AND status = 'issued'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT v.organization_id, v.name INTO v_org_id, v_venue_name
  FROM public.venues v
  WHERE v.id = NEW.venue_id;

  INSERT INTO public.invoices (
    invoice_number, booking_id, customer_id, organization_id,
    status, currency, line_items, total_amount, amount_due, due_at, metadata
  )
  VALUES (
    public.next_invoice_number(),
    NEW.id,
    NEW.customer_id,
    v_org_id,
    'issued',
    'PHP',
    jsonb_build_array(jsonb_build_object(
      'description', 'Reservation deposit — ' || COALESCE(v_venue_name, 'venue booking'),
      'quantity', 1,
      'unit_amount', NEW.deposit_amount,
      'amount', NEW.deposit_amount
    )),
    NEW.deposit_amount,
    NEW.deposit_amount,
    NEW.payment_due_at,
    jsonb_build_object(
      'booking_total_amount', NEW.total_amount,
      'event_date', NEW.event_date
    )
  );

  PERFORM public.log_audit(
    'invoice.issued', 'booking', NEW.id,
    jsonb_build_object('deposit_amount', NEW.deposit_amount)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_issue_deposit_invoice ON public.bookings;
CREATE TRIGGER bookings_issue_deposit_invoice
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.issue_deposit_invoice();

-- ── start_booking_payment: audit + provider reference support ─

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
    booking_id, amount, payment_provider, provider_reference,
    status, checkout_url, payment_kind, currency, metadata
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

  PERFORM public.log_audit(
    'payment.started', 'booking', p_booking_id,
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'provider', p_payment_provider::text,
      'amount', v_transaction.amount
    )
  );

  RETURN v_transaction;
END;
$$;

-- ── attach_payment_session ────────────────────────────────────
-- Called by trusted server code (service role) after the provider
-- checkout session is created, to persist the real hosted checkout URL
-- and session reference. Not client-callable: the webhook trusts
-- provider_reference for fallback booking correlation, so it must never
-- be attacker-settable.

CREATE OR REPLACE FUNCTION public.attach_payment_session(
  p_transaction_id uuid,
  p_provider_reference text,
  p_checkout_url text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_customer_id uuid;
BEGIN
  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  SELECT customer_id INTO v_customer_id
  FROM public.bookings
  WHERE id = v_transaction.booking_id;

  -- Service-role calls have no auth context; when a user context exists
  -- (defense in depth), it must be the booking customer or an admin.
  IF auth.uid() IS NOT NULL
     AND v_customer_id <> auth.uid()
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to update this transaction';
  END IF;

  IF v_transaction.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending transactions can be attached to a checkout session';
  END IF;

  UPDATE public.transactions
  SET provider_reference = COALESCE(NULLIF(BTRIM(p_provider_reference), ''), provider_reference),
      checkout_url = COALESCE(NULLIF(BTRIM(p_checkout_url), ''), checkout_url),
      metadata = metadata || COALESCE(p_metadata, '{}'::jsonb)
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

-- ── confirm_booking_payment: commission + receipt + invoice ───

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
  v_invoice public.invoices%ROWTYPE;
  v_amount numeric;
  v_commission numeric;
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

  v_commission := public.calculate_commission(v_booking.venue_id, v_amount);

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND payment_kind = 'deposit'
    AND (
      provider_reference = p_provider_reference
      OR (status = 'pending')
    )
  ORDER BY (provider_reference = p_provider_reference) DESC NULLS LAST,
           created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.transactions
    SET status = 'paid',
        amount = v_amount,
        commission_amount = v_commission,
        payment_provider = p_payment_provider,
        provider_reference = p_provider_reference,
        paid_at = now(),
        metadata = metadata || jsonb_build_object('confirmed_by', 'payment_webhook')
    WHERE id = v_transaction.id
    RETURNING * INTO v_transaction;
  ELSE
    INSERT INTO public.transactions (
      booking_id, amount, commission_amount, payment_provider,
      provider_reference, status, payment_kind, currency, paid_at, metadata
    )
    VALUES (
      p_booking_id, v_amount, v_commission, p_payment_provider,
      p_provider_reference, 'paid', 'deposit', 'PHP', now(),
      jsonb_build_object('confirmed_by', 'payment_webhook')
    )
    RETURNING * INTO v_transaction;
  END IF;

  -- Mark the open deposit invoice paid.
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE booking_id = p_booking_id AND status = 'issued'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.invoices
    SET status = 'paid',
        amount_paid = v_amount,
        amount_due = GREATEST(total_amount - v_amount, 0),
        paid_at = now()
    WHERE id = v_invoice.id;
  END IF;

  -- Issue the receipt (idempotent via UNIQUE(transaction_id)).
  INSERT INTO public.receipts (
    receipt_number, invoice_id, transaction_id, booking_id, customer_id,
    amount, currency, payment_provider, provider_reference, metadata
  )
  VALUES (
    public.next_receipt_number(),
    v_invoice.id,
    v_transaction.id,
    p_booking_id,
    v_booking.customer_id,
    v_amount,
    'PHP',
    p_payment_provider,
    p_provider_reference,
    jsonb_build_object('payment_kind', v_transaction.payment_kind)
  )
  ON CONFLICT (transaction_id) DO NOTHING;

  UPDATE public.bookings
  SET status = 'confirmed',
      paid_at = now(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  PERFORM public.log_audit(
    'payment.confirmed', 'booking', p_booking_id,
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'provider', p_payment_provider::text,
      'provider_reference', p_provider_reference,
      'amount', v_amount,
      'commission_amount', v_commission
    )
  );

  RETURN v_booking;
END;
$$;

-- ── fail_booking_payment: audit trail ─────────────────────────

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

  PERFORM public.log_audit(
    'payment.failed', 'booking', p_booking_id,
    jsonb_build_object(
      'provider', p_payment_provider::text,
      'provider_reference', p_provider_reference,
      'reason', p_failure_reason
    )
  );

  RETURN v_booking;
END;
$$;

-- ── Refund workflow ───────────────────────────────────────────

-- Customer, venue org member, or admin requests a refund for a
-- cancelled (paid) booking. Creates a pending refund row; the API
-- layer then calls the provider and moves it to processing.
CREATE OR REPLACE FUNCTION public.request_booking_refund(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_refund public.refunds%ROWTYPE;
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
    RAISE EXCEPTION 'You do not have permission to request a refund for this booking';
  END IF;

  IF v_booking.status::text <> 'cancelled' THEN
    RAISE EXCEPTION 'Refunds are only available for cancelled bookings';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND status = 'paid'
  ORDER BY paid_at DESC NULLS LAST, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This booking has no refundable payment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.refunds
    WHERE transaction_id = v_transaction.id
      AND status IN ('pending', 'processing', 'succeeded')
  ) THEN
    RAISE EXCEPTION 'A refund for this payment already exists';
  END IF;

  INSERT INTO public.refunds (
    booking_id, transaction_id, amount, currency, status, reason,
    requested_by, payment_provider, metadata
  )
  VALUES (
    p_booking_id,
    v_transaction.id,
    v_transaction.amount,
    v_transaction.currency,
    'pending',
    NULLIF(BTRIM(p_reason), ''),
    v_user_id,
    v_transaction.payment_provider,
    jsonb_build_object('payment_provider_reference', v_transaction.provider_reference)
  )
  RETURNING * INTO v_refund;

  PERFORM public.log_audit(
    'refund.requested', 'booking', p_booking_id,
    jsonb_build_object(
      'refund_id', v_refund.id,
      'transaction_id', v_transaction.id,
      'amount', v_refund.amount,
      'reason', v_refund.reason
    )
  );

  RETURN v_refund;
END;
$$;

-- Service role: mark a refund as sent to the provider.
CREATE OR REPLACE FUNCTION public.mark_refund_processing(
  p_refund_id uuid,
  p_provider_reference text
)
RETURNS public.refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
BEGIN
  UPDATE public.refunds
  SET status = 'processing',
      provider_reference = p_provider_reference
  WHERE id = p_refund_id
    AND status = 'pending'
  RETURNING * INTO v_refund;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund is not pending';
  END IF;

  PERFORM public.log_audit(
    'refund.processing', 'booking', v_refund.booking_id,
    jsonb_build_object('refund_id', p_refund_id, 'provider_reference', p_provider_reference)
  );

  RETURN v_refund;
END;
$$;

-- Service role (webhook): finalize a successful refund.
CREATE OR REPLACE FUNCTION public.complete_booking_refund(
  p_payment_provider public.payment_provider,
  p_provider_reference text,
  p_amount numeric DEFAULT NULL
)
RETURNS public.refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_refunded_total numeric;
BEGIN
  SELECT * INTO v_refund
  FROM public.refunds
  WHERE payment_provider = p_payment_provider
    AND provider_reference = p_provider_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found for provider reference %', p_provider_reference;
  END IF;

  IF v_refund.status = 'succeeded' THEN
    RETURN v_refund; -- idempotent replay
  END IF;

  UPDATE public.refunds
  SET status = 'succeeded',
      amount = COALESCE(p_amount, amount),
      processed_at = now()
  WHERE id = v_refund.id
  RETURNING * INTO v_refund;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = v_refund.transaction_id
  FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_refunded_total
  FROM public.refunds
  WHERE transaction_id = v_refund.transaction_id
    AND status = 'succeeded';

  UPDATE public.transactions
  SET status = CASE
        WHEN v_refunded_total >= v_transaction.amount THEN 'refunded'::public.transaction_status
        ELSE 'partially_refunded'::public.transaction_status
      END,
      metadata = metadata || jsonb_build_object('refunded_total', v_refunded_total)
  WHERE id = v_refund.transaction_id;

  UPDATE public.invoices
  SET status = 'refunded'
  WHERE booking_id = v_refund.booking_id
    AND status = 'paid'
    AND v_refunded_total >= v_transaction.amount;

  PERFORM public.log_audit(
    'refund.succeeded', 'booking', v_refund.booking_id,
    jsonb_build_object(
      'refund_id', v_refund.id,
      'provider_reference', p_provider_reference,
      'amount', v_refund.amount
    )
  );

  RETURN v_refund;
END;
$$;

-- Service role (webhook): record a failed refund.
CREATE OR REPLACE FUNCTION public.fail_booking_refund(
  p_payment_provider public.payment_provider,
  p_provider_reference text,
  p_failure_reason text DEFAULT NULL
)
RETURNS public.refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
BEGIN
  UPDATE public.refunds
  SET status = 'failed',
      failure_reason = NULLIF(BTRIM(p_failure_reason), ''),
      processed_at = now()
  WHERE payment_provider = p_payment_provider
    AND provider_reference = p_provider_reference
    AND status IN ('pending', 'processing')
  RETURNING * INTO v_refund;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found or already finalized for reference %', p_provider_reference;
  END IF;

  PERFORM public.log_audit(
    'refund.failed', 'booking', v_refund.booking_id,
    jsonb_build_object(
      'refund_id', v_refund.id,
      'provider_reference', p_provider_reference,
      'reason', p_failure_reason
    )
  );

  RETURN v_refund;
END;
$$;

-- ── Webhook idempotency claims ────────────────────────────────

-- Returns true when this call claimed the event (first delivery),
-- false when the event was already seen.
CREATE OR REPLACE FUNCTION public.claim_payment_webhook_event(
  p_provider public.payment_provider,
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First delivery inserts; a retry of a previously failed event
  -- re-claims it. Successful/processing events stay claimed.
  INSERT INTO public.payment_webhook_events (provider, event_id, event_type, payload)
  VALUES (p_provider, p_event_id, p_event_type, p_payload)
  ON CONFLICT (provider, event_id) DO UPDATE
    SET status = 'processing',
        error = NULL,
        received_at = now()
    WHERE public.payment_webhook_events.status = 'failed';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_payment_webhook_event(
  p_provider public.payment_provider,
  p_event_id text,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.payment_webhook_events
  SET status = p_status,
      error = p_error,
      processed_at = now()
  WHERE provider = p_provider
    AND event_id = p_event_id;
$$;

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds.select.customer" ON public.refunds FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "refunds.select.owner"    ON public.refunds FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "refunds.all.admin"       ON public.refunds FOR ALL USING (public.is_admin());

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices.select.customer" ON public.invoices FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "invoices.select.owner"    ON public.invoices FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "invoices.all.admin"       ON public.invoices FOR ALL USING (public.is_admin());

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts.select.customer" ON public.receipts FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "receipts.select.owner"    ON public.receipts FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "receipts.all.admin"       ON public.receipts FOR ALL USING (public.is_admin());

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_webhook_events.all.admin" ON public.payment_webhook_events FOR ALL USING (public.is_admin());

-- ── Grants ────────────────────────────────────────────────────
--
-- IMPORTANT: Postgres grants EXECUTE on new functions to PUBLIC by
-- default, and both `anon` and `authenticated` inherit PUBLIC. Revoking
-- only from anon/authenticated leaves the PUBLIC grant intact, so the
-- function stays callable with the public anon key. Every lockdown here
-- must therefore REVOKE ... FROM PUBLIC (which also covers anon,
-- authenticated) before granting the intended roles back.

-- Money-moving / webhook RPCs — service_role ONLY. A caller with the
-- public anon key must never be able to confirm payments, settle
-- refunds, or write the webhook idempotency ledger.
REVOKE EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_payment_session(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_refund(public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_refund(public.payment_provider, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_event(public.payment_provider, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payment_webhook_event(public.payment_provider, text, text, text) TO service_role;

-- Fix the pre-existing migration 021 lockdowns, which used the same
-- flawed REVOKE-from-anon pattern. Without this, anon can call
-- confirm_booking_payment and mark any approved booking paid for free.
REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, public.payment_provider, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_booking_payment(uuid, public.payment_provider, text, text) TO service_role;

-- Internal helpers — not meant to be called directly by clients.
REVOKE EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_commission(uuid, numeric) TO service_role;

-- Customer-facing RPCs — authenticated users only (not anon).
REVOKE EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking_refund(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_booking_payment(uuid, public.payment_provider, text, text) TO authenticated, service_role;

-- Sequences used inside SECURITY DEFINER functions only.
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.receipt_number_seq FROM PUBLIC;
