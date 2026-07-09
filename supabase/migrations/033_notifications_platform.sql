-- ============================================================
-- Migration 033 - Notification platform
-- ============================================================
-- Adds preferences, delivery queue, push subscriptions, and
-- workflow triggers for booking, payment, review, and admin alerts.

DO $$
BEGIN
  CREATE TYPE public.notification_kind AS ENUM (
    'booking_update',
    'payment_update',
    'review_request',
    'admin_alert',
    'supplier_inquiry',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_delivery_status AS ENUM (
    'queued',
    'sent',
    'failed',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind public.notification_kind NOT NULL DEFAULT 'booking_update',
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority public.notification_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

UPDATE public.notifications
SET kind = 'booking_update'
WHERE kind IS NULL;

UPDATE public.notifications
SET read_at = COALESCE(read_at, created_at)
WHERE is_read = true
  AND read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_kind_created
  ON public.notifications (user_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled    boolean NOT NULL DEFAULT true,
  sms_enabled      boolean NOT NULL DEFAULT false,
  push_enabled     boolean NOT NULL DEFAULT true,
  in_app_enabled   boolean NOT NULL DEFAULT true,
  booking_updates  boolean NOT NULL DEFAULT true,
  payment_updates  boolean NOT NULL DEFAULT true,
  review_requests  boolean NOT NULL DEFAULT true,
  admin_alerts     boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end   time,
  timezone          text NOT NULL DEFAULT 'Asia/Manila',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  disabled_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint)
);

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions (user_id, created_at DESC)
  WHERE disabled_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel             public.notification_channel NOT NULL,
  status              public.notification_delivery_status NOT NULL DEFAULT 'queued',
  provider            text,
  provider_message_id text,
  error_message       text,
  attempt_count       integer NOT NULL DEFAULT 0,
  next_attempt_at     timestamptz,
  attempted_at        timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_deliveries_unique_channel UNIQUE (notification_id, channel)
);

ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

DROP TRIGGER IF EXISTS notification_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON public.notification_deliveries (status, next_attempt_at, created_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user
  ON public.notification_deliveries (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_notification_preferences(p_user_id uuid)
RETURNS public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences public.notification_preferences%ROWTYPE;
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  RETURN v_preferences;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_allows_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_channel public.notification_channel
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences public.notification_preferences%ROWTYPE;
  v_channel_enabled boolean;
  v_kind_enabled boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  v_preferences := public.ensure_notification_preferences(p_user_id);

  v_channel_enabled := CASE p_channel
    WHEN 'email' THEN v_preferences.email_enabled
    WHEN 'sms' THEN false
    WHEN 'push' THEN v_preferences.push_enabled
    WHEN 'in_app' THEN v_preferences.in_app_enabled
    ELSE false
  END;

  v_kind_enabled := CASE p_kind
    WHEN 'booking_update' THEN v_preferences.booking_updates
    WHEN 'payment_update' THEN v_preferences.payment_updates
    WHEN 'review_request' THEN v_preferences.review_requests
    WHEN 'admin_alert' THEN v_preferences.admin_alerts
    ELSE true
  END;

  RETURN COALESCE(v_channel_enabled, false) AND COALESCE(v_kind_enabled, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_priority public.notification_priority DEFAULT 'normal',
  p_dedupe_key text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  IF NOT (
    public.user_allows_notification(p_user_id, p_kind, 'in_app')
    OR public.user_allows_notification(p_user_id, p_kind, 'email')
    OR public.user_allows_notification(p_user_id, p_kind, 'push')
  ) THEN
    RETURN NULL;
  END IF;

  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_notification_id
    FROM public.notifications
    WHERE user_id = p_user_id
      AND dedupe_key = p_dedupe_key
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
      RETURN v_notification_id;
    END IF;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    channel,
    kind,
    title,
    body,
    link,
    metadata,
    priority,
    dedupe_key,
    actor_id
  )
  VALUES (
    p_user_id,
    'in_app',
    p_kind,
    p_title,
    NULLIF(BTRIM(COALESCE(p_body, '')), ''),
    NULLIF(BTRIM(COALESCE(p_link, '')), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_priority, 'normal'),
    NULLIF(BTRIM(COALESCE(p_dedupe_key, '')), ''),
    p_actor_id
  )
  RETURNING id INTO v_notification_id;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'notification.created',
    'notification',
    v_notification_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'kind', p_kind::text,
      'priority', COALESCE(p_priority, 'normal')::text,
      'dedupe_key', NULLIF(BTRIM(COALESCE(p_dedupe_key, '')), '')
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notification_deliveries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel public.notification_channel;
  v_status public.notification_delivery_status;
  v_sent_at timestamptz;
BEGIN
  FOREACH v_channel IN ARRAY ARRAY[
    'in_app'::public.notification_channel,
    'email'::public.notification_channel,
    'push'::public.notification_channel
  ]
  LOOP
    IF public.user_allows_notification(NEW.user_id, NEW.kind, v_channel) THEN
      v_status := CASE WHEN v_channel = 'in_app' THEN 'sent' ELSE 'queued' END;
      v_sent_at := CASE WHEN v_channel = 'in_app' THEN now() ELSE NULL END;

      INSERT INTO public.notification_deliveries (
        notification_id,
        user_id,
        channel,
        status,
        sent_at
      )
      VALUES (
        NEW.id,
        NEW.user_id,
        v_channel,
        v_status,
        v_sent_at
      )
      ON CONFLICT (notification_id, channel) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_sms_notification_deliveries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.notification_preferences
  SET sms_enabled = false
  WHERE sms_enabled = true;

  UPDATE public.notification_deliveries
  SET status = 'skipped',
      provider = 'sms-disabled',
      error_message = 'SMS delivery is disabled for this phase',
      attempted_at = COALESCE(attempted_at, now()),
      updated_at = now()
  WHERE channel = 'sms'
    AND status IN ('queued', 'failed');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT public.disable_sms_notification_deliveries();

CREATE OR REPLACE FUNCTION public.retry_failed_notification_deliveries(
  p_limit integer DEFAULT 50
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.notification_deliveries
  SET status = 'queued',
      next_attempt_at = NULL,
      updated_at = now()
  WHERE id IN (
    SELECT id
    FROM public.notification_deliveries
    WHERE status = 'failed'
      AND channel <> 'sms'
      AND attempt_count < 3
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
    ORDER BY created_at ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_deliveries ON public.notifications;
CREATE TRIGGER notifications_enqueue_deliveries
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_deliveries();

CREATE TABLE IF NOT EXISTS public.notification_webhook_config (
  name       text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS notification_webhook_config_updated_at ON public.notification_webhook_config;
CREATE TRIGGER notification_webhook_config_updated_at
  BEFORE UPDATE ON public.notification_webhook_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_webhook_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_webhook_config FROM anon, authenticated;

DO $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions';
EXCEPTION
  WHEN insufficient_privilege OR undefined_file THEN
    RAISE NOTICE 'pg_net extension not installed. Configure Supabase Database Webhook manually if unavailable.';
END;
$$;

DO $$
DECLARE
  v_webhook_url text;
  v_webhook_auth text;
  v_has_http_request boolean;
  v_has_pg_net boolean;
BEGIN
  SELECT value INTO v_webhook_url
  FROM public.notification_webhook_config
  WHERE name = 'booking-notifications-url';

  SELECT value INTO v_webhook_auth
  FROM public.notification_webhook_config
  WHERE name = 'booking-notifications-auth';

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'net'
      AND p.proname = 'http_post'
  )
  INTO v_has_pg_net;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'supabase_functions'
      AND p.proname = 'http_request'
  )
  INTO v_has_http_request;

  DROP TRIGGER IF EXISTS notification_deliveries_dispatch_webhook
    ON public.notification_deliveries;

  IF v_has_pg_net THEN
    EXECUTE $trigger_function$
      CREATE OR REPLACE FUNCTION public.dispatch_notification_delivery_webhook()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, net
      AS $fn$
      DECLARE
        v_webhook_url text;
        v_webhook_auth text;
      BEGIN
        SELECT value INTO v_webhook_url
        FROM public.notification_webhook_config
        WHERE name = 'booking-notifications-url';

        SELECT value INTO v_webhook_auth
        FROM public.notification_webhook_config
        WHERE name = 'booking-notifications-auth';

        IF TG_OP <> 'INSERT'
          OR NEW.status <> 'queued'::public.notification_delivery_status
          OR NEW.channel = 'sms'::public.notification_channel
          OR v_webhook_url IS NULL
          OR v_webhook_auth IS NULL THEN
          RETURN NEW;
        END IF;

        PERFORM net.http_post(
          url := v_webhook_url,
          body := jsonb_build_object('record', to_jsonb(NEW)),
          params := '{}'::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_webhook_auth,
            'apikey', v_webhook_auth,
            'x-venora-event', 'notification-delivery-insert'
          ),
          timeout_milliseconds := 5000
        );

        RETURN NEW;
      END;
      $fn$;
    $trigger_function$;

    CREATE TRIGGER notification_deliveries_dispatch_webhook
      AFTER INSERT ON public.notification_deliveries
      FOR EACH ROW
      WHEN (NEW.status = 'queued'::public.notification_delivery_status AND NEW.channel <> 'sms'::public.notification_channel)
      EXECUTE FUNCTION public.dispatch_notification_delivery_webhook();
  ELSIF v_has_http_request AND v_webhook_url IS NOT NULL AND v_webhook_auth IS NOT NULL THEN
    EXECUTE format(
      'CREATE TRIGGER notification_deliveries_dispatch_webhook
       AFTER INSERT ON public.notification_deliveries
       FOR EACH ROW
       WHEN (NEW.status = ''queued'' AND NEW.channel <> ''sms''::public.notification_channel)
       EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
      v_webhook_url,
      'POST',
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_webhook_auth
      )::text,
      '{}'::text,
      '5000'
    );
  ELSE
    RAISE NOTICE
      'notification_deliveries_dispatch_webhook not created. Configure app.settings.notification_webhook_url/auth or create Supabase Database Webhook manually.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = COALESCE(read_at, now())
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  p_kind public.notification_kind,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_priority public.notification_priority DEFAULT 'normal',
  p_dedupe_key text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin record;
  v_count integer := 0;
BEGIN
  FOR v_admin IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  LOOP
    PERFORM public.create_notification(
      v_admin.user_id,
      p_kind,
      p_title,
      p_body,
      p_link,
      p_metadata,
      p_priority,
      CASE
        WHEN p_dedupe_key IS NULL THEN NULL
        ELSE p_dedupe_key || ':' || v_admin.user_id::text
      END
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  venue_name text;
  customer_title text;
  customer_body text;
  customer_link text;
  customer_kind public.notification_kind := 'booking_update';
  owner_title text;
  owner_body text;
  owner_kind public.notification_kind := 'booking_update';
  notification_metadata jsonb;
  owner_rec record;
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
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'New booking inquiry';
      owner_body := 'A customer requested ' || COALESCE(venue_name, 'your venue') || ' for ' || NEW.event_date::text || '.';
    WHEN 'approved' THEN
      customer_title := 'Venue approved your request';
      customer_body := 'Your quote is ready. Pay the deposit to confirm your booking.';
      customer_link := '/bookings/' || NEW.id::text || '/payment';
      owner_title := 'Booking approved';
      owner_body := 'The customer has been notified to pay the required deposit.';
    WHEN 'payment_pending' THEN
      customer_kind := 'payment_update';
      owner_kind := 'payment_update';
      customer_title := 'Payment started';
      customer_body := 'Your deposit payment is pending confirmation from the payment provider.';
      customer_link := '/bookings/' || NEW.id::text || '/payment';
      owner_title := 'Payment pending';
      owner_body := 'The customer started payment for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'confirmed' THEN
      customer_kind := 'payment_update';
      owner_kind := 'payment_update';
      customer_title := 'Booking confirmed';
      customer_body := 'Payment was received and your venue booking is confirmed.';
      customer_link := '/bookings/' || NEW.id::text || '/confirmation';
      owner_title := 'Booking confirmed';
      owner_body := 'Payment was received and the booking is confirmed.';
    WHEN 'declined' THEN
      customer_title := 'Booking request declined';
      customer_body := COALESCE(NEW.decline_reason, 'The venue declined this request.');
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking declined';
      owner_body := 'The customer has been notified.';
    WHEN 'cancelled' THEN
      customer_title := 'Booking cancelled';
      customer_body := 'This booking has been cancelled.';
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking cancelled';
      owner_body := 'This booking has been cancelled.';
    WHEN 'completed' THEN
      customer_kind := 'review_request';
      customer_title := 'How was your event?';
      customer_body := 'Your event is complete. Share a review to help future customers.';
      customer_link := '/bookings/' || NEW.id::text || '/review';
      owner_title := 'Booking completed';
      owner_body := 'The booking was marked complete and is ready for review.';
    WHEN 'reviewed' THEN
      customer_kind := 'review_request';
      owner_kind := 'review_request';
      customer_title := 'Review submitted';
      customer_body := 'Thanks for reviewing ' || COALESCE(venue_name, 'your venue') || '.';
      customer_link := '/bookings/' || NEW.id::text || '/review';
      owner_title := 'New venue review';
      owner_body := 'A customer submitted a review for ' || COALESCE(venue_name, 'your venue') || '.';
    WHEN 'expired' THEN
      customer_title := 'Booking request expired';
      customer_body := 'This request expired before it was confirmed.';
      customer_link := '/bookings/' || NEW.id::text;
      owner_title := 'Booking expired';
      owner_body := 'A booking request expired automatically.';
    ELSE
      customer_title := NULL;
      owner_title := NULL;
  END CASE;

  notification_metadata := jsonb_build_object(
    'booking_id', NEW.id,
    'venue_id', NEW.venue_id,
    'status', NEW.status::text,
    'event_date', NEW.event_date
  );

  IF customer_title IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      customer_kind,
      customer_title,
      customer_body,
      customer_link,
      notification_metadata,
      CASE WHEN NEW.status::text IN ('approved', 'confirmed') THEN 'high' ELSE 'normal' END,
      'booking:' || NEW.id::text || ':' || NEW.status::text || ':customer'
    );
  END IF;

  IF owner_title IS NOT NULL THEN
    FOR owner_rec IN
      SELECT DISTINCT om.user_id
      FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = NEW.venue_id
    LOOP
      PERFORM public.create_notification(
        owner_rec.user_id,
        owner_kind,
        owner_title,
        owner_body,
        '/dashboard/bookings/' || NEW.id::text,
        notification_metadata,
        CASE WHEN NEW.status::text IN ('pending', 'confirmed') THEN 'high' ELSE 'normal' END,
        'booking:' || NEW.id::text || ':' || NEW.status::text || ':owner:' || owner_rec.user_id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_status_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_venue_name text;
  customer_title text;
  customer_body text;
  customer_link text;
  owner_title text;
  owner_body text;
  notification_metadata jsonb;
  owner_rec record;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = NEW.booking_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_venue_name
  FROM public.venues
  WHERE id = v_booking.venue_id;

  CASE NEW.status::text
    WHEN 'pending' THEN
      customer_title := NULL;
      owner_title := NULL;
    WHEN 'paid' THEN
      customer_title := NULL;
      owner_title := NULL;
    WHEN 'failed' THEN
      customer_title := 'Payment failed';
      customer_body := COALESCE(NEW.failure_reason, 'Your payment could not be confirmed. Please try again.');
      customer_link := '/bookings/' || v_booking.id::text || '/payment';
      owner_title := 'Payment failed';
      owner_body := 'A customer payment attempt failed.';
    WHEN 'refunded' THEN
      customer_title := 'Payment refunded';
      customer_body := 'A refund was recorded for your booking.';
      customer_link := '/bookings/' || v_booking.id::text;
      owner_title := 'Payment refunded';
      owner_body := 'A refund was recorded for this booking.';
    WHEN 'partially_refunded' THEN
      customer_title := 'Partial refund recorded';
      customer_body := 'A partial refund was recorded for your booking.';
      customer_link := '/bookings/' || v_booking.id::text;
      owner_title := 'Partial refund recorded';
      owner_body := 'A partial refund was recorded for this booking.';
    ELSE
      customer_title := NULL;
      owner_title := NULL;
  END CASE;

  notification_metadata := jsonb_build_object(
    'booking_id', v_booking.id,
    'transaction_id', NEW.id,
    'venue_id', v_booking.venue_id,
    'status', NEW.status::text,
    'amount', NEW.amount,
    'currency', NEW.currency,
    'payment_provider', NEW.payment_provider::text
  );

  IF customer_title IS NOT NULL THEN
    PERFORM public.create_notification(
      v_booking.customer_id,
      'payment_update',
      customer_title,
      customer_body,
      customer_link,
      notification_metadata,
      CASE WHEN NEW.status::text IN ('paid', 'failed') THEN 'high' ELSE 'normal' END,
      'payment:' || NEW.id::text || ':' || NEW.status::text || ':customer'
    );
  END IF;

  IF owner_title IS NOT NULL THEN
    FOR owner_rec IN
      SELECT DISTINCT om.user_id
      FROM public.venues v
      JOIN public.organization_members om ON om.organization_id = v.organization_id
      WHERE v.id = v_booking.venue_id
    LOOP
      PERFORM public.create_notification(
        owner_rec.user_id,
        'payment_update',
        owner_title,
        owner_body,
        '/dashboard/bookings/' || v_booking.id::text,
        notification_metadata,
        CASE WHEN NEW.status::text = 'paid' THEN 'high' ELSE 'normal' END,
        'payment:' || NEW.id::text || ':' || NEW.status::text || ':owner:' || owner_rec.user_id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_status_notifications ON public.transactions;
CREATE TRIGGER transactions_status_notifications
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_status_notifications();

CREATE OR REPLACE FUNCTION public.create_verification_admin_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'admin_alert',
    'Verification request submitted',
    'A partner or venue verification request needs review.',
    '/admin/applications',
    jsonb_build_object(
      'verification_request_id', NEW.id,
      'profile_id', NEW.profile_id,
      'organization_id', NEW.organization_id,
      'type', NEW.type::text
    ),
    'high',
    'verification:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_requests_admin_notifications ON public.verification_requests;
CREATE TRIGGER verification_requests_admin_notifications
  AFTER INSERT ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_verification_admin_notifications();

CREATE OR REPLACE FUNCTION public.create_review_admin_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status::text = 'flagged'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_admins(
      'admin_alert',
      'Review needs moderation',
      'A venue review was flagged and needs admin review.',
      '/admin/reviews',
      jsonb_build_object(
        'review_id', NEW.id,
        'booking_id', NEW.booking_id,
        'venue_id', NEW.venue_id,
        'customer_id', NEW.customer_id
      ),
      'high',
      'review-flagged:' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_admin_notifications ON public.reviews;
CREATE TRIGGER reviews_admin_notifications
  AFTER UPDATE OF status ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_review_admin_notifications();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif.all.self" ON public.notifications;
DROP POLICY IF EXISTS "notif.select.self" ON public.notifications;
DROP POLICY IF EXISTS "notif.select.admin" ON public.notifications;
CREATE POLICY "notif.select.self" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif.select.admin" ON public.notifications
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "notif_pref.all.self" ON public.notification_preferences;
DROP POLICY IF EXISTS "notif_pref.all.admin" ON public.notification_preferences;
CREATE POLICY "notif_pref.all.self" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_pref.all.admin" ON public.notification_preferences
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "push_subs.all.self" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs.all.admin" ON public.push_subscriptions;
CREATE POLICY "push_subs.all.self" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs.all.admin" ON public.push_subscriptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "notif_delivery.select.self" ON public.notification_deliveries;
DROP POLICY IF EXISTS "notif_delivery.all.admin" ON public.notification_deliveries;
CREATE POLICY "notif_delivery.select.self" ON public.notification_deliveries
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_delivery.all.admin" ON public.notification_deliveries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT EXECUTE ON FUNCTION public.ensure_notification_preferences(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_notification_deliveries(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_sms_notification_deliveries() TO service_role;

COMMENT ON TABLE public.notification_preferences IS
  'Per-user channel and category preferences for transactional notification delivery.';
COMMENT ON TABLE public.notification_deliveries IS
  'Delivery queue and audit trail for email, SMS, push, and in-app notifications.';
COMMENT ON TABLE public.push_subscriptions IS
  'Web Push subscriptions registered by user devices.';
