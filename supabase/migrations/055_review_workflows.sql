-- ============================================================
-- Migration 055 — Venue/Supplier Review Workflows & Account Status
-- ============================================================
--
-- Wires up the venue approval and supplier accreditation actions that
-- app/(admin)/admin/{venues,suppliers}/page.tsx have been deliberately
-- read-only stubs for, plus adds the account suspend/reactivate capability
-- that didn't exist anywhere (profiles.status has supported 'suspended'
-- since the enum was created, but nothing ever set it).
--
-- Design notes:
--   * venue_status has no 'rejected' value, so a rejected venue goes back
--     to 'draft' (the owner can edit and resubmit) — the actual rejection
--     decision + reason lives in venue_review_history, not the status
--     column. accreditation_status DOES have 'rejected', so suppliers use
--     it directly.
--   * Every mutation goes through a SECURITY DEFINER function (row-locked,
--     precondition-checked, permission-gated via has_admin_permission()
--     from migration 054) — never a raw UPDATE — mirroring the existing
--     approve_booking_quote() pattern.
--   * venues has no contact-detail columns (organizations doesn't either),
--     so approval validation intentionally does not check "contact
--     details" for venues — there is nowhere for that data to live in the
--     current schema. Suppliers DO have contact_email/contact_phone, so
--     that validation applies there.
--   * notification_kind and create_notification() both had two
--     conflicting definitions across older migrations (035/037 vs 036);
--     confirmed against the live database that 036's 9-arg signature and
--     enum values (including 'admin_alert') are what's actually deployed,
--     so this migration calls create_notification() with 9 positional
--     args, matching how 041_partner_application_notifications.sql does.

-- ── supplier_profiles: add the cancellation_policy column Phase 7 needs ──
ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS cancellation_policy text;

-- ================================================================
-- venue_review_history — append-only decision trail
-- ================================================================
CREATE TABLE public.venue_review_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  action          text NOT NULL CHECK (action IN (
                    'begin_review', 'approve', 'reject', 'request_info',
                    'suspend', 'restore', 'unpublish', 'note'
                  )),
  previous_status public.venue_status,
  new_status      public.venue_status,
  reason          text,
  actor_id        uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_review_history_venue ON public.venue_review_history (venue_id, created_at DESC);

COMMENT ON TABLE public.venue_review_history IS
  'Append-only venue review decision trail. Write only via admin_review_venue().';

ALTER TABLE public.venue_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_review_history.select.admin"
  ON public.venue_review_history FOR SELECT
  USING (public.has_admin_permission('venues.view'));

CREATE POLICY "venue_review_history.select.owner"
  ON public.venue_review_history FOR SELECT
  USING (public.is_org_member_for_venue(venue_id));

-- No INSERT/UPDATE/DELETE policy for anyone — admin_review_venue() is the
-- only writer (SECURITY DEFINER).

-- ================================================================
-- supplier_review_history — append-only decision trail
-- ================================================================
CREATE TABLE public.supplier_review_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     uuid NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  action          text NOT NULL CHECK (action IN (
                    'begin_review', 'approve', 'reject', 'request_info',
                    'suspend', 'restore', 'note'
                  )),
  previous_status public.accreditation_status,
  new_status      public.accreditation_status,
  reason          text,
  actor_id        uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_review_history_supplier ON public.supplier_review_history (supplier_id, created_at DESC);

COMMENT ON TABLE public.supplier_review_history IS
  'Append-only supplier review decision trail. Write only via admin_review_supplier().';

ALTER TABLE public.supplier_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_review_history.select.admin"
  ON public.supplier_review_history FOR SELECT
  USING (public.has_admin_permission('suppliers.view'));

CREATE POLICY "supplier_review_history.select.owner"
  ON public.supplier_review_history FOR SELECT
  USING (public.is_supplier_owner(supplier_id));

-- ================================================================
-- admin_review_venue() — the only way to change venues.status
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_review_venue(
  p_venue_id uuid,
  p_action   text,
  p_reason   text DEFAULT NULL
)
RETURNS public.venues
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_venue            public.venues%ROWTYPE;
  v_previous_status  public.venue_status;
  v_new_status       public.venue_status;
  v_permission       text;
  v_image_count      int;
BEGIN
  v_permission := CASE p_action
    WHEN 'begin_review' THEN 'venues.review'
    WHEN 'request_info' THEN 'venues.review'
    WHEN 'note'         THEN 'venues.review'
    WHEN 'approve'      THEN 'venues.approve'
    WHEN 'reject'       THEN 'venues.reject'
    WHEN 'suspend'      THEN 'venues.suspend'
    WHEN 'restore'      THEN 'venues.suspend'
    WHEN 'unpublish'    THEN 'venues.suspend'
    ELSE NULL
  END;

  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'Unknown venue review action: %', p_action;
  END IF;

  IF NOT public.has_admin_permission(v_permission) THEN
    RAISE EXCEPTION 'You do not have permission to perform this venue review action';
  END IF;

  SELECT * INTO v_venue FROM public.venues WHERE id = p_venue_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  v_previous_status := v_venue.status;
  v_new_status := v_previous_status;

  CASE p_action
    WHEN 'approve' THEN
      IF v_previous_status NOT IN ('draft', 'pending_approval') THEN
        RAISE EXCEPTION 'Only draft or pending venues can be approved (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(v_venue.name, '')) = '' THEN
        RAISE EXCEPTION 'Venue name is required before approval';
      END IF;
      IF btrim(coalesce(v_venue.address, '')) = '' THEN
        RAISE EXCEPTION 'Venue address is required before approval';
      END IF;
      IF btrim(coalesce(v_venue.province, '')) = '' OR btrim(coalesce(v_venue.city, '')) = '' THEN
        RAISE EXCEPTION 'Venue province and city are required before approval';
      END IF;
      IF v_venue.latitude IS NULL OR v_venue.longitude IS NULL THEN
        RAISE EXCEPTION 'Venue must have valid map coordinates before approval';
      END IF;
      IF v_venue.latitude < -90 OR v_venue.latitude > 90 OR v_venue.longitude < -180 OR v_venue.longitude > 180 THEN
        RAISE EXCEPTION 'Venue coordinates are out of valid range';
      END IF;
      IF v_venue.capacity_max <= 0 THEN
        RAISE EXCEPTION 'Venue capacity must be greater than zero';
      END IF;
      IF v_venue.base_price <= 0 THEN
        RAISE EXCEPTION 'Venue base price must be greater than zero';
      END IF;
      IF btrim(coalesce(v_venue.cancellation_policy, '')) = '' THEN
        RAISE EXCEPTION 'A cancellation policy is required before approval';
      END IF;

      SELECT count(*) INTO v_image_count FROM public.venue_images WHERE venue_id = p_venue_id;
      IF v_image_count = 0 THEN
        RAISE EXCEPTION 'At least one venue photo is required before approval';
      END IF;

      v_new_status := 'published';

    WHEN 'reject' THEN
      IF v_previous_status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Only venues pending approval can be rejected (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to reject a venue';
      END IF;
      v_new_status := 'draft';

    WHEN 'suspend' THEN
      IF v_previous_status <> 'published' THEN
        RAISE EXCEPTION 'Only published venues can be suspended (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to suspend a venue';
      END IF;
      v_new_status := 'suspended';

    WHEN 'restore' THEN
      IF v_previous_status <> 'suspended' THEN
        RAISE EXCEPTION 'Only suspended venues can be restored (current status: %)', v_previous_status;
      END IF;
      v_new_status := 'published';

    WHEN 'unpublish' THEN
      IF v_previous_status <> 'published' THEN
        RAISE EXCEPTION 'Only published venues can be unpublished (current status: %)', v_previous_status;
      END IF;
      v_new_status := 'draft';

    WHEN 'request_info' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required when requesting additional information';
      END IF;

    WHEN 'begin_review' THEN
      NULL;

    WHEN 'note' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'Note text is required';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unhandled venue review action: %', p_action;
  END CASE;

  IF v_new_status IS DISTINCT FROM v_previous_status THEN
    UPDATE public.venues SET status = v_new_status, updated_at = now()
    WHERE id = p_venue_id
    RETURNING * INTO v_venue;
  END IF;

  INSERT INTO public.venue_review_history (venue_id, action, previous_status, new_status, reason, actor_id)
  VALUES (
    p_venue_id, p_action, v_previous_status,
    NULLIF(v_new_status::text, v_previous_status::text)::public.venue_status,
    p_reason, auth.uid()
  );

  PERFORM public.log_admin_action(
    'venue.' || p_action, 'venue', p_venue_id, p_reason, NULL,
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', v_new_status)
  );

  RETURN v_venue;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_venue(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_venue(uuid, text, text) TO authenticated;

-- ================================================================
-- admin_review_supplier() — the only way to change accreditation_status
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_review_supplier(
  p_supplier_id uuid,
  p_action      text,
  p_reason      text DEFAULT NULL
)
RETURNS public.supplier_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_supplier         public.supplier_profiles%ROWTYPE;
  v_previous_status  public.accreditation_status;
  v_new_status       public.accreditation_status;
  v_permission       text;
BEGIN
  v_permission := CASE p_action
    WHEN 'begin_review' THEN 'suppliers.review'
    WHEN 'request_info' THEN 'suppliers.review'
    WHEN 'note'         THEN 'suppliers.review'
    WHEN 'approve'      THEN 'suppliers.approve'
    WHEN 'reject'       THEN 'suppliers.reject'
    WHEN 'suspend'      THEN 'suppliers.suspend'
    WHEN 'restore'      THEN 'suppliers.suspend'
    ELSE NULL
  END;

  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'Unknown supplier review action: %', p_action;
  END IF;

  IF NOT public.has_admin_permission(v_permission) THEN
    RAISE EXCEPTION 'You do not have permission to perform this supplier review action';
  END IF;

  SELECT * INTO v_supplier FROM public.supplier_profiles WHERE id = p_supplier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  v_previous_status := v_supplier.accreditation_status;
  v_new_status := v_previous_status;

  CASE p_action
    WHEN 'approve' THEN
      IF v_previous_status NOT IN ('pending', 'rejected') THEN
        RAISE EXCEPTION 'Only pending or previously rejected suppliers can be accredited (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(v_supplier.business_name, '')) = '' THEN
        RAISE EXCEPTION 'Business name is required before accreditation';
      END IF;
      IF v_supplier.category_id IS NULL THEN
        RAISE EXCEPTION 'A service category is required before accreditation';
      END IF;
      IF btrim(coalesce(v_supplier.contact_email, '')) = '' AND btrim(coalesce(v_supplier.contact_phone, '')) = '' THEN
        RAISE EXCEPTION 'At least one contact method (email or phone) is required before accreditation';
      END IF;
      IF v_supplier.service_areas IS NULL OR array_length(v_supplier.service_areas, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one service area is required before accreditation';
      END IF;
      v_new_status := 'accredited';

    WHEN 'reject' THEN
      IF v_previous_status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending suppliers can be rejected (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to reject a supplier';
      END IF;
      v_new_status := 'rejected';

    WHEN 'suspend' THEN
      IF v_previous_status <> 'accredited' THEN
        RAISE EXCEPTION 'Only accredited suppliers can be suspended (current status: %)', v_previous_status;
      END IF;
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required to suspend a supplier';
      END IF;
      v_new_status := 'suspended';

    WHEN 'restore' THEN
      IF v_previous_status NOT IN ('suspended', 'rejected') THEN
        RAISE EXCEPTION 'Only suspended or rejected suppliers can be restored (current status: %)', v_previous_status;
      END IF;
      v_new_status := CASE WHEN v_previous_status = 'suspended' THEN 'accredited' ELSE 'pending' END;

    WHEN 'request_info' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A reason is required when requesting additional information';
      END IF;

    WHEN 'begin_review' THEN
      NULL;

    WHEN 'note' THEN
      IF btrim(coalesce(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'Note text is required';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unhandled supplier review action: %', p_action;
  END CASE;

  IF v_new_status IS DISTINCT FROM v_previous_status THEN
    UPDATE public.supplier_profiles
    SET accreditation_status = v_new_status,
        updated_at = now(),
        published_at = CASE WHEN v_new_status = 'accredited' AND published_at IS NULL THEN now() ELSE published_at END
    WHERE id = p_supplier_id
    RETURNING * INTO v_supplier;
  END IF;

  INSERT INTO public.supplier_review_history (supplier_id, action, previous_status, new_status, reason, actor_id)
  VALUES (
    p_supplier_id, p_action, v_previous_status,
    NULLIF(v_new_status::text, v_previous_status::text)::public.accreditation_status,
    p_reason, auth.uid()
  );

  PERFORM public.log_admin_action(
    'supplier.' || p_action, 'supplier', p_supplier_id, p_reason, NULL,
    jsonb_build_object('accreditation_status', v_previous_status),
    jsonb_build_object('accreditation_status', v_new_status)
  );

  RETURN v_supplier;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_supplier(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_supplier(uuid, text, text) TO authenticated;

-- ================================================================
-- admin_set_account_status() — suspend/reactivate ANY account
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  p_profile_id uuid,
  p_new_status text,
  p_reason     text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_profile             public.profiles%ROWTYPE;
  v_previous_status     public.account_status;
  v_new_status          public.account_status;
  v_permission          text;
  v_target_tier         public.admin_tier;
  v_other_active_supers int;
BEGIN
  IF p_new_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Unsupported account status transition: %', p_new_status;
  END IF;
  v_new_status := p_new_status::public.account_status;

  v_permission := CASE v_new_status
    WHEN 'suspended' THEN 'users.suspend'
    WHEN 'active'    THEN 'users.reactivate'
  END;

  IF NOT public.has_admin_permission(v_permission) THEN
    RAISE EXCEPTION 'You do not have permission to change this account''s status';
  END IF;

  IF v_new_status = 'suspended' AND p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  v_previous_status := v_profile.status;

  IF v_new_status = 'suspended' THEN
    IF v_previous_status NOT IN ('active', 'pending_verification') THEN
      RAISE EXCEPTION 'Only active accounts can be suspended (current status: %)', v_previous_status;
    END IF;
    IF btrim(coalesce(p_reason, '')) = '' THEN
      RAISE EXCEPTION 'A reason is required to suspend an account';
    END IF;

    -- Belt-and-suspenders: admin_assign_tier() already protects the last
    -- super_admin's TIER, but suspending their PROFILE would lock them out
    -- just as effectively, so guard here too.
    SELECT tier INTO v_target_tier
    FROM public.admin_user_roles WHERE user_id = p_profile_id AND is_active;

    IF v_target_tier = 'super_admin' THEN
      SELECT count(*) INTO v_other_active_supers
      FROM public.admin_user_roles aur
      JOIN public.profiles p ON p.id = aur.user_id
      WHERE aur.tier = 'super_admin' AND aur.is_active
        AND aur.user_id <> p_profile_id
        AND p.status = 'active';

      IF v_other_active_supers = 0 THEN
        RAISE EXCEPTION 'Cannot suspend the last active super administrator';
      END IF;
    END IF;
  ELSE
    IF v_previous_status <> 'suspended' THEN
      RAISE EXCEPTION 'Only suspended accounts can be reactivated (current status: %)', v_previous_status;
    END IF;
  END IF;

  UPDATE public.profiles SET status = v_new_status, updated_at = now()
  WHERE id = p_profile_id
  RETURNING * INTO v_profile;

  PERFORM public.log_admin_action(
    CASE WHEN v_new_status = 'suspended' THEN 'user.suspended' ELSE 'user.reactivated' END,
    'profile', p_profile_id, p_reason, NULL,
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', v_new_status)
  );

  BEGIN
    PERFORM public.create_notification(
      p_profile_id, 'system'::public.notification_kind,
      CASE WHEN v_new_status = 'suspended' THEN 'Your account has been suspended' ELSE 'Your account has been reactivated' END,
      CASE WHEN v_new_status = 'suspended' THEN coalesce(p_reason, 'Please contact support for details.') ELSE 'You can now sign in and use Venora as normal.' END,
      NULL, '{}'::jsonb, 'high'::public.notification_priority, NULL, auth.uid()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_set_account_status notification failed for profile %: %', p_profile_id, SQLERRM;
  END;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text) TO authenticated;

-- ================================================================
-- Notification triggers: venue status changes + new-submission alerts
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_venue_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_title  text;
  v_body   text;
  v_member RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status <> 'pending_approval') THEN
    BEGIN
      PERFORM public.notify_admins(
        'admin_alert'::public.notification_kind,
        'New venue awaiting review',
        NEW.name || ' was submitted for approval.',
        '/admin/venues',
        jsonb_build_object('venue_id', NEW.id),
        'normal'::public.notification_priority,
        'venue:' || NEW.id::text || ':submitted'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_admins failed for venue %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    CASE
      WHEN OLD.status = 'pending_approval' AND NEW.status = 'published' THEN
        v_title := 'Your venue was approved';
        v_body  := NEW.name || ' is now live on Venora.';
      WHEN OLD.status = 'pending_approval' AND NEW.status = 'draft' THEN
        v_title := 'Your venue submission needs changes';
        v_body  := NEW.name || ' was not approved. Review the notes and resubmit when ready.';
      WHEN OLD.status = 'published' AND NEW.status = 'suspended' THEN
        v_title := 'Your venue was suspended';
        v_body  := NEW.name || ' has been suspended and is no longer visible to customers.';
      WHEN OLD.status = 'suspended' AND NEW.status = 'published' THEN
        v_title := 'Your venue was restored';
        v_body  := NEW.name || ' is visible to customers again.';
      WHEN OLD.status = 'published' AND NEW.status = 'draft' THEN
        v_title := 'Your venue was unpublished';
        v_body  := NEW.name || ' is no longer visible to customers.';
      ELSE
        v_title := NULL;
    END CASE;

    IF v_title IS NOT NULL THEN
      FOR v_member IN
        SELECT owner_id AS user_id FROM public.organizations WHERE id = NEW.organization_id
        UNION
        SELECT user_id FROM public.organization_members WHERE organization_id = NEW.organization_id
      LOOP
        BEGIN
          PERFORM public.create_notification(
            v_member.user_id, 'system'::public.notification_kind, v_title, v_body,
            '/dashboard/venues', jsonb_build_object('venue_id', NEW.id),
            'high'::public.notification_priority,
            'venue:' || NEW.id::text || ':' || NEW.status::text || ':' || v_member.user_id::text
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'create_venue_status_notifications failed for venue % user %: %', NEW.id, v_member.user_id, SQLERRM;
        END;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_status_notifications_after_change ON public.venues;
CREATE TRIGGER venue_status_notifications_after_change
  AFTER INSERT OR UPDATE OF status ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.create_venue_status_notifications();

-- ================================================================
-- Notification triggers: supplier accreditation changes + submission alerts
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_supplier_status_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_title text;
  v_body  text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.accreditation_status IS NOT DISTINCT FROM NEW.accreditation_status THEN
    RETURN NEW;
  END IF;

  IF NEW.accreditation_status = 'pending' AND (TG_OP = 'INSERT' OR OLD.accreditation_status <> 'pending') THEN
    BEGIN
      PERFORM public.notify_admins(
        'admin_alert'::public.notification_kind,
        'New supplier awaiting review',
        NEW.business_name || ' was submitted for accreditation.',
        '/admin/suppliers',
        jsonb_build_object('supplier_id', NEW.id),
        'normal'::public.notification_priority,
        'supplier:' || NEW.id::text || ':submitted'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_admins failed for supplier %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    CASE
      WHEN NEW.accreditation_status = 'accredited' THEN
        v_title := 'Your supplier profile was accredited';
        v_body  := NEW.business_name || ' is now visible to customers on Venora.';
      WHEN NEW.accreditation_status = 'rejected' THEN
        v_title := 'Your supplier profile was not accredited';
        v_body  := 'Review the notes on ' || NEW.business_name || ' and resubmit when ready.';
      WHEN OLD.accreditation_status = 'accredited' AND NEW.accreditation_status = 'suspended' THEN
        v_title := 'Your supplier profile was suspended';
        v_body  := NEW.business_name || ' has been suspended and is no longer visible to customers.';
      WHEN OLD.accreditation_status = 'rejected' AND NEW.accreditation_status = 'pending' THEN
        v_title := 'Your supplier application was reopened';
        v_body  := 'An admin has reopened ' || NEW.business_name || ' for another review.';
      ELSE
        v_title := NULL;
    END CASE;

    IF v_title IS NOT NULL THEN
      BEGIN
        PERFORM public.create_notification(
          NEW.profile_id, 'system'::public.notification_kind, v_title, v_body,
          '/dashboard/supplier', jsonb_build_object('supplier_id', NEW.id),
          'high'::public.notification_priority,
          'supplier:' || NEW.id::text || ':' || NEW.accreditation_status::text
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'create_supplier_status_notifications failed for supplier %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_status_notifications_after_change ON public.supplier_profiles;
CREATE TRIGGER supplier_status_notifications_after_change
  AFTER INSERT OR UPDATE OF accreditation_status ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_supplier_status_notifications();

-- ================================================================
-- Indexes flagged by the Phase 1 audit as missing for admin queue queries
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_venues_status_created ON public.venues (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications (status, created_at DESC);
