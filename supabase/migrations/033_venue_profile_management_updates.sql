-- Venue profile management polish:
-- - Add common owner-selectable amenities used by the dashboard editor.
-- - Allow zero-priced venue packages for complimentary/included packages.

INSERT INTO public.amenities (name) VALUES
  ('Catering Area'),
  ('Ceremony Venue'),
  ('Dressing Room'),
  ('Indoor Area'),
  ('Outdoor Area'),
  ('Reception Venue'),
  ('Restrooms'),
  ('Valet Parking'),
  ('Wheelchair Accessible')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.venue_packages
  DROP CONSTRAINT IF EXISTS venue_packages_price_check;

ALTER TABLE public.venue_packages
  ADD CONSTRAINT venue_packages_price_check CHECK (price >= 0);
