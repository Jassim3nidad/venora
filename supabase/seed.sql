-- ============================================================
-- Venora — Database Seed
-- ============================================================
-- Run: supabase db seed
-- ============================================================

-- Profiles
insert into public.profiles (id, full_name, status) values
  ('00000000-0000-0000-0000-000000000001', 'Admin User',        'active'),
  ('00000000-0000-0000-0000-000000000002', 'Jane Venue Owner',  'active'),
  ('00000000-0000-0000-0000-000000000003', 'Mark Customer',     'active'),
  ('00000000-0000-0000-0000-000000000004', 'Sam Supplier',      'active');

-- User Roles
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'venue_owner'),
  ('00000000-0000-0000-0000-000000000003', 'customer'),
  ('00000000-0000-0000-0000-000000000004', 'supplier');

-- Organizations
insert into public.organizations (id, owner_id, name) values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Jane Venues Group');

-- Organization Members
insert into public.organization_members (organization_id, user_id, role) values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner');

-- Sample Venue
insert into public.venues (
  id, organization_id, name, slug, description,
  province, city, municipality, address,
  capacity_min, capacity_max, base_price, price_unit, status
) values (
  '10000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'The Grand Terrace',
  'the-grand-terrace',
  'A stunning rooftop venue overlooking the city skyline.',
  'Metro Manila', 'Makati City', 'Makati', '123 Ayala Avenue',
  50, 300, 45000, 'per_event', 'published'
);

-- Sample Venue Package
insert into public.venue_packages (
  id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active
) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Silver Package',
  'Perfect for intimate gatherings',
  65000, 'per_event', 50, 150,
  array['Tables & Chairs', 'Basic Lighting', 'Sound System', '6-hour use'],
  true
);

-- Global Commission Rule
insert into public.commission_rules (id, scope, percentage, effective_from) values
  ('90000000-0000-0000-0000-000000000001', 'global', 10.00, '2026-01-01');
