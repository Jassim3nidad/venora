-- ============================================================
-- Migration 023 — Suppliers can respond to their own inquiries
-- ============================================================
-- The supplier portal lets a supplier accept/decline booking requests
-- attached to them (booking_suppliers). Previously only the venue
-- owner/org member and admin could update these rows; suppliers could
-- only SELECT. This adds a scoped UPDATE policy so a supplier can
-- transition their own booking_suppliers row (status, agreed_price)
-- without being able to touch anyone else's.

CREATE POLICY "booking_sup.update.supplier"
  ON public.booking_suppliers FOR UPDATE
  USING (public.is_supplier_owner(supplier_id))
  WITH CHECK (public.is_supplier_owner(supplier_id));

COMMENT ON POLICY "booking_sup.update.supplier" ON public.booking_suppliers IS
  'Suppliers may accept/decline (update status/agreed_price on) their own booking_suppliers rows.';
