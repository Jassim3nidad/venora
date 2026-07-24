-- Fix partner application notifications by using the 9-argument create_notification
-- overload and explicit casts.

CREATE OR REPLACE FUNCTION public.create_partner_application_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_label text;
  v_dashboard_link text;
BEGIN
  v_role_label := public.partner_application_role_label(NEW.role_applied_for);
  v_dashboard_link := public.partner_application_dashboard_link(NEW.role_applied_for);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'system'::public.notification_kind,
      'Partner application submitted',
      format(
        'Your %s application is under review. We''ll notify you when a decision is made.',
        v_role_label
      ),
      '/account/become-partner',
      jsonb_build_object(
        'partner_application_id', NEW.id,
        'status', NEW.status::text,
        'role_applied_for', NEW.role_applied_for::text
      ),
      'normal'::public.notification_priority,
      'partner_application:submitted:' || NEW.id::text,
      NEW.user_id
    );

    PERFORM public.notify_admins(
      'admin_alert'::public.notification_kind,
      'New partner application',
      format('A new %s application is ready for review.', v_role_label),
      '/admin/applications',
      jsonb_build_object(
        'partner_application_id', NEW.id,
        'user_id', NEW.user_id,
        'role_applied_for', NEW.role_applied_for::text,
        'category', NEW.category
      ),
      'high'::public.notification_priority,
      'partner_application:admin:' || NEW.id::text
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'system'::public.notification_kind,
        'Partner application approved',
        format(
          'Your %s application was approved. Your workspace is now active.',
          v_role_label
        ),
        v_dashboard_link,
        jsonb_build_object(
          'partner_application_id', NEW.id,
          'status', NEW.status::text,
          'role_applied_for', NEW.role_applied_for::text
        ),
        'high'::public.notification_priority,
        'partner_application:approved:' || NEW.id::text,
        auth.uid()
      );
    ELSIF NEW.status = 'denied' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'system'::public.notification_kind,
        'Partner application declined',
        CASE
          WHEN NULLIF(BTRIM(COALESCE(NEW.denial_reason, '')), '') IS NOT NULL THEN
            format(
              'Your %s application was declined. Reason: %s',
              v_role_label,
              BTRIM(NEW.denial_reason)
            )
          ELSE
            format(
              'Your %s application was declined. You can review the details and apply again.',
              v_role_label
            )
        END,
        '/account/become-partner',
        jsonb_build_object(
          'partner_application_id', NEW.id,
          'status', NEW.status::text,
          'role_applied_for', NEW.role_applied_for::text,
          'denial_reason', NEW.denial_reason
        ),
        'normal'::public.notification_priority,
        'partner_application:denied:' || NEW.id::text,
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
