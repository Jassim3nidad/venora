-- ============================================================
-- Migration 012 — Row Level Security (Complete)
-- ============================================================
-- Role access is determined by public.user_roles (many-to-many).
-- Role checks go through security definer helper functions.
-- Ownership is resolved through organization_members.
-- Admins get an explicit bypass policy per table.
-- Policy naming: "<table>.<operation>.<actor>"
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles.select.public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles.update.self"
  ON public.profiles FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles.all.admin"
  ON public.profiles FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- USER_ROLES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles.select.self"
  ON public.user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles.all.admin"
  ON public.user_roles FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations.select.member"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_org_member(id)
  );

CREATE POLICY "organizations.insert.venue_owner"
  ON public.organizations FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.has_role('venue_owner')
  );

CREATE POLICY "organizations.update.owner"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "organizations.all.admin"
  ON public.organizations FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ORGANIZATION_MEMBERS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members.select.member"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_org_owner(organization_id)
  );

CREATE POLICY "org_members.insert.org_owner"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY "org_members.delete.org_owner"
  ON public.organization_members FOR DELETE
  USING (public.is_org_owner(organization_id));

CREATE POLICY "org_members.all.admin"
  ON public.organization_members FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUE LOOKUP TABLES (public read-only)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venue_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_categories.select.all" ON public.venue_categories FOR SELECT USING (true);
CREATE POLICY "venue_categories.all.admin"  ON public.venue_categories FOR ALL  USING (public.is_admin());

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_types.select.all" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "event_types.all.admin"  ON public.event_types FOR ALL  USING (public.is_admin());

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities.select.all" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "amenities.all.admin"  ON public.amenities FOR ALL  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_venues"
  ON public.venues FOR SELECT USING (status = 'published');

CREATE POLICY "org_members_manage_own_venues"
  ON public.venues FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "admin_full_access_venues"
  ON public.venues FOR ALL USING (public.is_admin());

-- Junction tables inherit venue access
ALTER TABLE public.venue_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_cat.select.all"   ON public.venue_category_assignments FOR SELECT USING (true);
CREATE POLICY "venue_cat.all.owner"    ON public.venue_category_assignments FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_cat.all.admin"    ON public.venue_category_assignments FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_et.select.all"   ON public.venue_event_types FOR SELECT USING (true);
CREATE POLICY "venue_et.all.owner"    ON public.venue_event_types FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_et.all.admin"    ON public.venue_event_types FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_am.select.all"   ON public.venue_amenities FOR SELECT USING (true);
CREATE POLICY "venue_am.all.owner"    ON public.venue_amenities FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_am.all.admin"    ON public.venue_amenities FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_img.select.all"   ON public.venue_images FOR SELECT USING (true);
CREATE POLICY "venue_img.all.owner"    ON public.venue_images FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_img.all.admin"    ON public.venue_images FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_pkg.select.all"   ON public.venue_packages FOR SELECT USING (true);
CREATE POLICY "venue_pkg.all.owner"    ON public.venue_packages FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_pkg.all.admin"    ON public.venue_packages FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUE_AVAILABILITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail.select.all"   ON public.venue_availability FOR SELECT USING (true);
CREATE POLICY "avail.all.owner"    ON public.venue_availability FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "avail.all.admin"    ON public.venue_availability FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- INQUIRIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries.select.customer" ON public.inquiries FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "inquiries.select.owner"    ON public.inquiries FOR SELECT USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "inquiries.insert.customer" ON public.inquiries FOR INSERT WITH CHECK (customer_id = auth.uid() AND public.has_role('customer'));
CREATE POLICY "inquiries.update.owner"    ON public.inquiries FOR UPDATE USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "inquiries.all.admin"       ON public.inquiries FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_bookings"
  ON public.bookings FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customers_create_bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid() AND public.has_role('customer'));

-- Customer: cancel own pending booking
CREATE POLICY "customers_cancel_own_booking"
  ON public.bookings FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "venue_org_manages_bookings"
  ON public.bookings FOR ALL
  USING (public.is_org_member_for_venue(venue_id));

CREATE POLICY "admin_full_access_bookings"
  ON public.bookings FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- BOOKING_STATUS_HISTORY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bsh.select.customer" ON public.booking_status_history FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "bsh.select.owner"    ON public.booking_status_history FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "bsh.all.admin"       ON public.booking_status_history FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- FAVORITES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites.all.customer"
  ON public.favorites FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- SUPPLIERS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_cat.select.all" ON public.supplier_categories FOR SELECT USING (true);
CREATE POLICY "sup_cat.all.admin"  ON public.supplier_categories FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_profiles.select.accredited" ON public.supplier_profiles FOR SELECT USING (accreditation_status = 'accredited');
CREATE POLICY "sup_profiles.select.self"       ON public.supplier_profiles FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "sup_profiles.insert.supplier"   ON public.supplier_profiles FOR INSERT WITH CHECK (profile_id = auth.uid() AND public.has_role('supplier'));
CREATE POLICY "sup_profiles.update.self"       ON public.supplier_profiles FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "sup_profiles.all.admin"         ON public.supplier_profiles FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_services.select.all"   ON public.supplier_services FOR SELECT USING (true);
CREATE POLICY "sup_services.all.self"     ON public.supplier_services FOR ALL USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "sup_services.all.admin"    ON public.supplier_services FOR ALL USING (public.is_admin());

ALTER TABLE public.venue_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_sup.select.all"   ON public.venue_suppliers FOR SELECT USING (true);
CREATE POLICY "venue_sup.all.owner"    ON public.venue_suppliers FOR ALL USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "venue_sup.all.admin"    ON public.venue_suppliers FOR ALL USING (public.is_admin());

ALTER TABLE public.booking_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_sup.select.customer" ON public.booking_suppliers FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "booking_sup.select.owner"    ON public.booking_suppliers FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "booking_sup.select.supplier" ON public.booking_suppliers FOR SELECT USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "booking_sup.all.owner"       ON public.booking_suppliers FOR ALL USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "booking_sup.all.admin"       ON public.booking_suppliers FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews.select.published" ON public.reviews FOR SELECT USING (status = 'published');
CREATE POLICY "reviews.select.self"      ON public.reviews FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "reviews.insert.customer"  ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "reviews.update.self"      ON public.reviews FOR UPDATE USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "reviews.update.owner_reply" ON public.reviews FOR UPDATE USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "reviews.all.admin"        ON public.reviews FOR ALL USING (public.is_admin());

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_reviews.select.published" ON public.supplier_reviews FOR SELECT USING (status = 'published');
CREATE POLICY "sup_reviews.select.self"      ON public.supplier_reviews FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "sup_reviews.insert.customer"  ON public.supplier_reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "sup_reviews.all.admin"        ON public.supplier_reviews FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- AI TABLES (service_role / Edge Functions only)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venue_embeddings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_content     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_content.select.owner" ON public.ai_generated_content FOR SELECT USING (public.is_org_member_for_venue(venue_id));
CREATE POLICY "ai_content.all.admin"    ON public.ai_generated_content FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs.select.self"  ON public.ai_search_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_logs.all.admin"    ON public.ai_search_logs FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rec.select.self" ON public.ai_recommendation_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_rec.all.admin"   ON public.ai_recommendation_events FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conv.all.self"  ON public.ai_conversations FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_conv.all.admin" ON public.ai_conversations FOR ALL USING (public.is_admin());

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_msg.all.participant" ON public.ai_messages FOR ALL USING (public.is_conversation_participant(conversation_id));

-- ─────────────────────────────────────────────────────────────
-- ADMIN / PAYMENTS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.commission_rules     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission.select.owner" ON public.commission_rules FOR SELECT USING (scope = 'venue' AND public.is_org_member_for_venue(reference_id));
CREATE POLICY "commission.all.admin"    ON public.commission_rules FOR ALL USING (public.is_admin());

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions.select.customer" ON public.transactions FOR SELECT USING (public.is_booking_customer(booking_id));
CREATE POLICY "transactions.select.owner"    ON public.transactions FOR SELECT USING (public.is_org_member_for_booking(booking_id));
CREATE POLICY "transactions.all.admin"       ON public.transactions FOR ALL USING (public.is_admin());

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts.select.org_owner" ON public.payouts FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "payouts.select.supplier"  ON public.payouts FOR SELECT USING (public.is_supplier_owner(supplier_id));
CREATE POLICY "payouts.all.admin"        ON public.payouts FOR ALL USING (public.is_admin());

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif.select.self"  ON public.verification_requests FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "verif.insert.self"  ON public.verification_requests FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "verif.all.admin"    ON public.verification_requests FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif.all.self"  ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif.all.admin" ON public.notifications FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- AUDIT_LOGS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit.select.admin" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- VENUE_ANALYTICS (materialized view access control function)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_venue_analytics(
  p_venue_id    uuid,
  p_from        date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to          date DEFAULT CURRENT_DATE,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE (
  period         timestamptz,
  booking_count  bigint,
  revenue        numeric,
  commission     numeric,
  avg_rating     numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    date_trunc(p_granularity, vad.month) AS period,
    sum(vad.booking_count)::bigint         AS booking_count,
    sum(vad.revenue)                       AS revenue,
    sum(vad.commission)                    AS commission,
    avg(vad.avg_rating)::numeric(3,1)      AS avg_rating
  FROM   public.mv_venue_monthly_stats vad
  WHERE  vad.venue_id = p_venue_id
    AND  vad.month::date BETWEEN p_from AND p_to
    AND  (
      public.is_org_member_for_venue(p_venue_id) OR public.is_admin()
    )
  GROUP  BY date_trunc(p_granularity, vad.month)
  ORDER  BY 1;
$$;
