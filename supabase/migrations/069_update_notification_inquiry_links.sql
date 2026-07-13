-- Update customer notification link targets for supplier inquiries

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
        '/inquiries/' || NEW.inquiry_id::text,
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
          WHEN v_sender_is_supplier THEN '/inquiries/' || NEW.inquiry_id::text
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
