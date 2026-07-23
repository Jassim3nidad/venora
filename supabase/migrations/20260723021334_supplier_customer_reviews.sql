-- Connect accepted customer supplier proposals to supplier jobs and enforce
-- completed-booking eligibility for supplier reviews.

CREATE OR REPLACE FUNCTION public.respond_supplier_quote_customer(
  p_quote_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.supplier_quotes%ROWTYPE;
  v_inquiry public.supplier_contact_requests%ROWTYPE;
  v_supplier_owner uuid;
  v_booking_supplier_id uuid;
BEGIN
  IF p_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Unsupported proposal response';
  END IF;

  SELECT *
    INTO v_quote
  FROM public.supplier_quotes
  WHERE id = p_quote_id
    AND customer_id = auth.uid()
  FOR UPDATE;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Service Proposal not found';
  END IF;

  IF v_quote.status <> 'sent' THEN
    RAISE EXCEPTION 'Service Proposal is no longer eligible for this action';
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < current_date THEN
    RAISE EXCEPTION 'Service Proposal has expired';
  END IF;

  SELECT *
    INTO v_inquiry
  FROM public.supplier_contact_requests
  WHERE id = v_quote.inquiry_id
  FOR UPDATE;

  IF v_inquiry.id IS NULL THEN
    RAISE EXCEPTION 'Supplier inquiry not found';
  END IF;

  IF v_inquiry.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'You cannot respond to this Service Proposal';
  END IF;

  UPDATE public.supplier_quotes
  SET status = p_status
  WHERE id = v_quote.id
  RETURNING * INTO v_quote;

  IF p_status = 'accepted' AND v_inquiry.booking_id IS NOT NULL THEN
    INSERT INTO public.booking_suppliers (
      booking_id,
      supplier_id,
      service_id,
      agreed_price,
      status
    )
    VALUES (
      v_inquiry.booking_id,
      v_quote.supplier_id,
      v_inquiry.service_id,
      v_quote.total,
      'confirmed'
    )
    ON CONFLICT (booking_id, supplier_id) DO UPDATE
      SET service_id = COALESCE(EXCLUDED.service_id, booking_suppliers.service_id),
          agreed_price = COALESCE(EXCLUDED.agreed_price, booking_suppliers.agreed_price),
          status = 'confirmed'
    RETURNING id INTO v_booking_supplier_id;
  END IF;

  SELECT profile_id
    INTO v_supplier_owner
  FROM public.supplier_profiles
  WHERE id = v_quote.supplier_id;

  IF v_supplier_owner IS NOT NULL THEN
    BEGIN
      PERFORM public.create_notification(
        v_supplier_owner,
        'supplier_inquiry'::public.notification_kind,
        CASE
          WHEN p_status = 'accepted' THEN 'Service Proposal accepted'
          ELSE 'Service Proposal declined'
        END,
        CASE
          WHEN p_status = 'accepted' THEN 'A customer accepted your Service Proposal.'
          ELSE 'A customer declined your Service Proposal.'
        END,
        '/dashboard/supplier/inquiries/' || v_quote.inquiry_id::text,
        jsonb_build_object(
          'quote_id', v_quote.id,
          'inquiry_id', v_quote.inquiry_id,
          'supplier_id', v_quote.supplier_id,
          'status', p_status,
          'booking_supplier_id', v_booking_supplier_id
        ),
        'normal'::public.notification_priority,
        'supplier_quote:' || v_quote.id::text || ':' || p_status,
        auth.uid()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'supplier quote response notification failed for quote %: %', v_quote.id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'quote_id', v_quote.id,
    'inquiry_id', v_quote.inquiry_id,
    'supplier_id', v_quote.supplier_id,
    'status', v_quote.status,
    'booking_supplier_id', v_booking_supplier_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_supplier_quote_customer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_supplier_quote_customer(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.respond_supplier_quote_customer(uuid, text) IS
  'Allows an inquiry customer to accept or decline only their own sent, unexpired supplier proposal and creates a confirmed supplier job for linked venue bookings.';

CREATE OR REPLACE FUNCTION public.check_supplier_review_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_status public.booking_status;
  v_booking_customer uuid;
  v_supplier_id uuid;
  v_job_status text;
BEGIN
  SELECT b.status, b.customer_id, bs.supplier_id, bs.status
    INTO v_booking_status, v_booking_customer, v_supplier_id, v_job_status
  FROM public.booking_suppliers bs
  JOIN public.bookings b ON b.id = bs.booking_id
  WHERE bs.id = NEW.booking_supplier_id;

  IF v_booking_customer IS NULL THEN
    RAISE EXCEPTION 'Supplier job not found';
  END IF;

  IF v_booking_customer <> NEW.customer_id THEN
    RAISE EXCEPTION 'Only the booking customer can review this supplier';
  END IF;

  IF v_supplier_id <> NEW.supplier_id THEN
    RAISE EXCEPTION 'Supplier review does not match the supplier job';
  END IF;

  IF v_job_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Cannot review a supplier job that is not confirmed';
  END IF;

  IF v_booking_status::text NOT IN ('completed', 'reviewed') THEN
    RAISE EXCEPTION
      'Cannot review a supplier before the linked venue booking is completed (current status: %)',
      v_booking_status::text;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_supplier_review_eligibility() FROM PUBLIC;

DROP TRIGGER IF EXISTS supplier_reviews_check_eligibility ON public.supplier_reviews;
CREATE TRIGGER supplier_reviews_check_eligibility
  BEFORE INSERT ON public.supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_supplier_review_eligibility();

COMMENT ON FUNCTION public.check_supplier_review_eligibility() IS
  'Rejects supplier reviews unless the row matches the customer, confirmed supplier job, and completed linked venue booking.';
