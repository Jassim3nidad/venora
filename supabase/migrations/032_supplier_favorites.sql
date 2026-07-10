-- ============================================================
-- Migration 025 — Customer supplier favorites
-- ============================================================
-- Mirrors public.favorites (venue shortlist) for accredited
-- suppliers a customer wants to save from the marketplace.

CREATE TABLE IF NOT EXISTS public.supplier_favorites (
  customer_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id uuid        NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_favorites_customer
  ON public.supplier_favorites(customer_id);

ALTER TABLE public.supplier_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_favorites.all.customer"
  ON public.supplier_favorites FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

COMMENT ON TABLE public.supplier_favorites IS
  'Customer shortlist of accredited suppliers saved from the marketplace.';
