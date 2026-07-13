-- Customer supplier inquiry tracking support.
-- Adds safe customer proposal response RPC and participant notifications.

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
  v_supplier_owner uuid;
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

  UPDATE public.supplier_quotes
  SET status = p_status
  WHERE id = v_quote.id
  RETURNING * INTO v_quote;

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
          'status', p_status
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
    'status', v_quote.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_supplier_quote_customer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_supplier_quote_customer(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_supplier_quote_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'sent' THEN
    BEGIN
      PERFORM public.create_notification(
        NEW.customer_id,
        'supplier_inquiry'::public.notification_kind,
        'Service Proposal received',
        'A supplier sent a Service Proposal for your inquiry.',
        '/account/inquiries/' || NEW.inquiry_id::text,
        jsonb_build_object(
          'quote_id', NEW.id,
          'inquiry_id', NEW.inquiry_id,
          'supplier_id', NEW.supplier_id,
          'status', NEW.status
        ),
        'normal'::public.notification_priority,
        'supplier_quote:' || NEW.id::text || ':sent',
        NEW.supplier_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'supplier quote sent notification failed for quote %: %', NEW.id, SQLERRM;
    END;

    UPDATE public.supplier_contact_requests
    SET status = 'responded'
    WHERE id = NEW.inquiry_id
      AND status = 'new';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_quote_customer_notifications ON public.supplier_quotes;
CREATE TRIGGER supplier_quote_customer_notifications
  AFTER UPDATE OF status ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_quote_customer();

CREATE OR REPLACE FUNCTION public.notify_supplier_inquiry_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquiry public.supplier_contact_requests%ROWTYPE;
  v_supplier_owner uuid;
  v_recipient uuid;
  v_sender_is_supplier boolean := false;
BEGIN
  SELECT *
    INTO v_inquiry
  FROM public.supplier_contact_requests
  WHERE id = NEW.inquiry_id;

  IF v_inquiry.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT profile_id
    INTO v_supplier_owner
  FROM public.supplier_profiles
  WHERE id = v_inquiry.supplier_id;

  v_sender_is_supplier := v_supplier_owner IS NOT NULL AND NEW.sender_id = v_supplier_owner;

  IF v_sender_is_supplier THEN
    v_recipient := v_inquiry.customer_id;
    UPDATE public.supplier_contact_requests
    SET status = 'responded'
    WHERE id = v_inquiry.id
      AND status = 'new';
  ELSE
    v_recipient := v_supplier_owner;
  END IF;

  IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
    BEGIN
      PERFORM public.create_notification(
        v_recipient,
        'supplier_inquiry'::public.notification_kind,
        'New supplier inquiry message',
        'You have a new message in a supplier inquiry.',
        CASE
          WHEN v_sender_is_supplier THEN '/account/inquiries/' || NEW.inquiry_id::text
          ELSE '/dashboard/supplier/inquiries/' || NEW.inquiry_id::text
        END,
        jsonb_build_object(
          'message_id', NEW.id,
          'inquiry_id', NEW.inquiry_id,
          'supplier_id', v_inquiry.supplier_id
        ),
        'normal'::public.notification_priority,
        'supplier_inquiry_message:' || NEW.id::text,
        NEW.sender_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'supplier inquiry message notification failed for message %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_inquiry_message_notifications ON public.supplier_inquiry_messages;
CREATE TRIGGER supplier_inquiry_message_notifications
  AFTER INSERT ON public.supplier_inquiry_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_inquiry_message();

COMMENT ON FUNCTION public.respond_supplier_quote_customer(uuid, text) IS
  'Allows an inquiry customer to accept or decline only their own sent, unexpired supplier proposal without granting broad table update privileges.';
