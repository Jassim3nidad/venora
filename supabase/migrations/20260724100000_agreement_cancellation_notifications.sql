-- Migration: Add trigger to fire dual notifications when a commercial agreement is expired/cancelled
-- Notifies both the supplier and the venue owner when an active agreement transitions to 'expired'

CREATE OR REPLACE FUNCTION public.notify_on_agreement_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supplier_user_id   UUID;
  v_venue_name         TEXT;
  v_supplier_name      TEXT;
  v_service_label      TEXT;
BEGIN
  -- Only fire when transitioning active -> expired
  IF OLD.status = 'active' AND NEW.status = 'expired' THEN

    -- Resolve supplier user id
    SELECT sp.profile_id INTO v_supplier_user_id
    FROM public.supplier_profiles sp
    WHERE sp.id = NEW.supplier_id
    LIMIT 1;

    -- Resolve venue and supplier display names
    SELECT v.name INTO v_venue_name
    FROM public.venues v WHERE v.id = NEW.venue_id LIMIT 1;

    SELECT sp.business_name INTO v_supplier_name
    FROM public.supplier_profiles sp WHERE sp.id = NEW.supplier_id LIMIT 1;

    v_service_label := COALESCE(NEW.custom_service_name, 'their service');

    -- Notify supplier
    IF v_supplier_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_supplier_user_id,
        'system'::public.notification_kind,
        'Commercial Agreement Cancelled',
        format(
          'Your agreement for %s with %s has been cancelled and is now expired.',
          v_service_label,
          COALESCE(v_venue_name, 'the venue')
        ),
        '/dashboard/supplier/partnerships',
        jsonb_build_object(
          'agreement_id', NEW.id,
          'venue_id', NEW.venue_id,
          'supplier_id', NEW.supplier_id,
          'previous_status', OLD.status::text,
          'new_status', NEW.status::text
        ),
        'normal'::public.notification_priority,
        'agreement:cancelled:supplier:' || NEW.id::text,
        v_supplier_user_id
      );
    END IF;

    -- Notify all venue-linked organization members (coordinators and owners)
    PERFORM public.create_notification(
      om.user_id,
      'system'::public.notification_kind,
      'Commercial Agreement Cancelled',
      format(
        'The agreement with %s for %s has been cancelled and is now expired.',
        COALESCE(v_supplier_name, 'the supplier'),
        v_service_label
      ),
      '/dashboard/coordinator/suppliers',
      jsonb_build_object(
        'agreement_id', NEW.id,
        'venue_id', NEW.venue_id,
        'supplier_id', NEW.supplier_id,
        'previous_status', OLD.status::text,
        'new_status', NEW.status::text
      ),
      'normal'::public.notification_priority,
      'agreement:cancelled:venue:' || NEW.id::text || ':' || om.user_id::text,
      om.user_id
    )
    FROM public.organization_members om
    JOIN public.venues v ON v.business_profile_id = om.organization_id
    WHERE v.id = NEW.venue_id AND om.status = 'active';

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agreement_cancelled ON public.venue_supplier_agreements;
CREATE TRIGGER on_agreement_cancelled
  AFTER UPDATE OF status ON public.venue_supplier_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_agreement_cancelled();
