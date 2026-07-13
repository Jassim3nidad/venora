-- Supplier dashboard quotes, inquiry messages, and availability.

CREATE TABLE public.supplier_quotes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id          uuid NOT NULL REFERENCES public.supplier_contact_requests(id) ON DELETE CASCADE,
  supplier_id         uuid NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  customer_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  service_description text,
  subtotal            numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  additional_fees     numeric(12,2) NOT NULL DEFAULT 0 CHECK (additional_fees >= 0),
  total               numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  valid_until         date,
  terms               text,
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'withdrawn')),
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inquiry_id)
);

CREATE TABLE public.supplier_quote_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid NOT NULL REFERENCES public.supplier_quotes(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(description) BETWEEN 2 AND 240),
  quantity    numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total  numeric(12,2) NOT NULL CHECK (line_total >= 0),
  sort_order  integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_inquiry_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.supplier_contact_requests(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_availability (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  date       date NOT NULL,
  status     text NOT NULL CHECK (status IN ('available', 'unavailable', 'blocked')),
  reason     text CHECK (reason IS NULL OR char_length(reason) <= 300),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, date)
);

CREATE INDEX idx_supplier_quotes_supplier_status
  ON public.supplier_quotes(supplier_id, status, created_at DESC);
CREATE INDEX idx_supplier_quotes_customer
  ON public.supplier_quotes(customer_id, created_at DESC);
CREATE INDEX idx_supplier_quote_items_quote
  ON public.supplier_quote_items(quote_id, sort_order);
CREATE INDEX idx_supplier_inquiry_messages_inquiry
  ON public.supplier_inquiry_messages(inquiry_id, created_at);
CREATE INDEX idx_supplier_availability_month
  ON public.supplier_availability(supplier_id, date);

CREATE TRIGGER supplier_quotes_updated_at
  BEFORE UPDATE ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER supplier_availability_updated_at
  BEFORE UPDATE ON public.supplier_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_supplier_quote_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inquiry_supplier_id uuid;
  inquiry_customer_id uuid;
BEGIN
  SELECT supplier_id, customer_id
    INTO inquiry_supplier_id, inquiry_customer_id
  FROM public.supplier_contact_requests
  WHERE id = NEW.inquiry_id;

  IF inquiry_supplier_id IS NULL OR inquiry_customer_id IS NULL THEN
    RAISE EXCEPTION 'Quote inquiry must have a supplier and customer';
  END IF;

  NEW.supplier_id := inquiry_supplier_id;
  NEW.customer_id := inquiry_customer_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_quotes_set_participants
  BEFORE INSERT OR UPDATE OF inquiry_id ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_supplier_quote_participants();

CREATE OR REPLACE FUNCTION public.enforce_supplier_quote_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_supplier_owner(OLD.supplier_id) THEN
    IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
      NEW.sent_at := COALESCE(NEW.sent_at, now());
      RETURN NEW;
    END IF;

    IF OLD.status = 'sent' AND NEW.status = 'withdrawn' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Supplier cannot change quote status from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_quotes_enforce_transition
  BEFORE UPDATE OF status ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_quote_transition();

CREATE OR REPLACE FUNCTION public.is_supplier_inquiry_participant(target_inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_contact_requests inquiry
    WHERE inquiry.id = target_inquiry_id
      AND (
        inquiry.customer_id = auth.uid()
        OR public.is_supplier_owner(inquiry.supplier_id)
        OR public.is_admin()
      )
  );
$$;

ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_quotes.select.participant"
  ON public.supplier_quotes FOR SELECT
  USING (public.is_supplier_inquiry_participant(inquiry_id));

CREATE POLICY "supplier_quotes.insert.supplier"
  ON public.supplier_quotes FOR INSERT
  WITH CHECK (
    public.is_supplier_owner(supplier_id)
    AND EXISTS (
      SELECT 1 FROM public.supplier_contact_requests inquiry
      WHERE inquiry.id = inquiry_id
        AND inquiry.supplier_id = supplier_id
        AND inquiry.customer_id = customer_id
    )
  );

CREATE POLICY "supplier_quotes.update.supplier"
  ON public.supplier_quotes FOR UPDATE
  USING (public.is_supplier_owner(supplier_id))
  WITH CHECK (public.is_supplier_owner(supplier_id));

CREATE POLICY "supplier_quotes.all.admin"
  ON public.supplier_quotes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "supplier_quote_items.select.participant"
  ON public.supplier_quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_quotes quote
      WHERE quote.id = quote_id
        AND public.is_supplier_inquiry_participant(quote.inquiry_id)
    )
  );

CREATE POLICY "supplier_quote_items.write.supplier"
  ON public.supplier_quote_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_quotes quote
      WHERE quote.id = quote_id
        AND public.is_supplier_owner(quote.supplier_id)
        AND quote.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_quotes quote
      WHERE quote.id = quote_id
        AND public.is_supplier_owner(quote.supplier_id)
        AND quote.status = 'draft'
    )
  );

CREATE POLICY "supplier_quote_items.all.admin"
  ON public.supplier_quote_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "supplier_messages.select.participant"
  ON public.supplier_inquiry_messages FOR SELECT
  USING (public.is_supplier_inquiry_participant(inquiry_id));

CREATE POLICY "supplier_messages.insert.participant"
  ON public.supplier_inquiry_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_supplier_inquiry_participant(inquiry_id)
  );

CREATE POLICY "supplier_messages.all.admin"
  ON public.supplier_inquiry_messages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "supplier_availability.select.public"
  ON public.supplier_availability FOR SELECT
  USING (true);

CREATE POLICY "supplier_availability.write.self"
  ON public.supplier_availability FOR ALL
  USING (public.is_supplier_owner(supplier_id))
  WITH CHECK (
    public.is_supplier_owner(supplier_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "supplier_availability.all.admin"
  ON public.supplier_availability FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.upsert_supplier_quote_dashboard(
  p_quote_id uuid,
  p_inquiry_id uuid,
  p_title text,
  p_service_description text,
  p_items jsonb,
  p_additional_fees numeric,
  p_valid_until date,
  p_terms text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owned_supplier_id uuid;
  inquiry_customer_id uuid;
  result_quote_id uuid;
  item jsonb;
  item_quantity numeric;
  item_unit_price numeric;
  calculated_subtotal numeric := 0;
  item_index integer := 0;
BEGIN
  SELECT id INTO owned_supplier_id
  FROM public.supplier_profiles
  WHERE profile_id = auth.uid();

  SELECT customer_id INTO inquiry_customer_id
  FROM public.supplier_contact_requests
  WHERE id = p_inquiry_id AND supplier_id = owned_supplier_id;

  IF owned_supplier_id IS NULL OR inquiry_customer_id IS NULL THEN
    RAISE EXCEPTION 'Supplier inquiry not found';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Quote requires at least one line item';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unitPrice')::numeric;
    IF item_quantity <= 0 OR item_unit_price < 0 THEN
      RAISE EXCEPTION 'Invalid quote line item amount';
    END IF;
    calculated_subtotal := calculated_subtotal + (item_quantity * item_unit_price);
  END LOOP;

  IF p_quote_id IS NULL THEN
    INSERT INTO public.supplier_quotes (
      inquiry_id, supplier_id, customer_id, title, service_description,
      subtotal, additional_fees, total, valid_until, terms
    ) VALUES (
      p_inquiry_id, owned_supplier_id, inquiry_customer_id, btrim(p_title),
      NULLIF(btrim(p_service_description), ''), calculated_subtotal,
      COALESCE(p_additional_fees, 0),
      calculated_subtotal + COALESCE(p_additional_fees, 0),
      p_valid_until, NULLIF(btrim(p_terms), '')
    )
    RETURNING id INTO result_quote_id;
  ELSE
    UPDATE public.supplier_quotes
    SET title = btrim(p_title),
        service_description = NULLIF(btrim(p_service_description), ''),
        subtotal = calculated_subtotal,
        additional_fees = COALESCE(p_additional_fees, 0),
        total = calculated_subtotal + COALESCE(p_additional_fees, 0),
        valid_until = p_valid_until,
        terms = NULLIF(btrim(p_terms), '')
    WHERE id = p_quote_id
      AND inquiry_id = p_inquiry_id
      AND supplier_id = owned_supplier_id
      AND status = 'draft'
    RETURNING id INTO result_quote_id;

    IF result_quote_id IS NULL THEN
      RAISE EXCEPTION 'Editable quote not found';
    END IF;

    DELETE FROM public.supplier_quote_items WHERE quote_id = result_quote_id;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unitPrice')::numeric;
    INSERT INTO public.supplier_quote_items (
      quote_id, description, quantity, unit_price, line_total, sort_order
    ) VALUES (
      result_quote_id, btrim(item->>'description'), item_quantity,
      item_unit_price, item_quantity * item_unit_price, item_index
    );
    item_index := item_index + 1;
  END LOOP;

  RETURN result_quote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_supplier_quote_dashboard(
  uuid, uuid, text, text, jsonb, numeric, date, text
) TO authenticated;

COMMENT ON TABLE public.supplier_quotes IS
  'Supplier-authored quotes linked to direct marketplace inquiries.';
COMMENT ON TABLE public.supplier_inquiry_messages IS
  'Text-only conversation between a supplier inquiry customer and supplier.';
COMMENT ON TABLE public.supplier_availability IS
  'Manual supplier availability overrides; confirmed supplier work is projected separately.';
