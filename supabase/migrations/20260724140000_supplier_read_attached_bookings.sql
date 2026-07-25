-- Allow suppliers to read bookings (and venue names) for jobs they are
-- attached to via booking_suppliers. Without this, Jobs lists rows with
-- status only while nested bookings/venues are null under RLS.

CREATE OR REPLACE FUNCTION public.is_supplier_attached_to_booking(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_suppliers bs
    WHERE bs.booking_id = p_booking_id
      AND public.is_supplier_owner(bs.supplier_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_attached_to_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_suppliers bs
    JOIN public.bookings b ON b.id = bs.booking_id
    WHERE b.venue_id = p_venue_id
      AND public.is_supplier_owner(bs.supplier_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_supplier_attached_to_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_supplier_attached_to_venue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supplier_attached_to_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supplier_attached_to_venue(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_supplier_attached_to_booking(uuid) IS
  'True when the current auth user owns a supplier_profiles row attached to the booking.';

COMMENT ON FUNCTION public.is_supplier_attached_to_venue(uuid) IS
  'True when the current auth user is attached to any booking at this venue.';

DROP POLICY IF EXISTS "suppliers_view_attached_bookings" ON public.bookings;
CREATE POLICY "suppliers_view_attached_bookings"
  ON public.bookings FOR SELECT
  USING (public.is_supplier_attached_to_booking(id));

DROP POLICY IF EXISTS "suppliers_view_venues_for_attached_bookings" ON public.venues;
CREATE POLICY "suppliers_view_venues_for_attached_bookings"
  ON public.venues FOR SELECT
  USING (public.is_supplier_attached_to_venue(id));
