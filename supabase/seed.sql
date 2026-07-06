-- ============================================================
-- Venora Database Seed
-- Generated from apps/web/src/data/venues.json
-- Source dataset: VENUES.zip / venues.json
-- Venues imported: 11
-- Venue images linked: 55
-- Synthetic seed reviews from the source dataset are intentionally not inserted.
-- ============================================================

BEGIN;

-- Seed auth users required by profile foreign keys. Password auth is not used by the app seed.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@venora.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin User","role":"admin"}'::jsonb, false, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner@venora.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Venora Venue Owner","role":"venue_owner"}'::jsonb, false, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'customer@venora.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Venora Customer","role":"customer"}'::jsonb, false, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'supplier@venora.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Venora Supplier","role":"supplier"}'::jsonb, false, now(), now(), '', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

-- Profiles and roles
INSERT INTO public.profiles (id, full_name, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Venora Venue Owner', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Venora Customer', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'Venora Supplier', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = EXCLUDED.status;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'venue_owner'),
  ('00000000-0000-0000-0000-000000000003', 'customer'),
  ('00000000-0000-0000-0000-000000000004', 'supplier')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.organizations (id, owner_id, name) VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Venora Research Venue Partners')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id;

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Remove prior fictional/demo venues and refresh dataset venues.
DELETE FROM public.venues
WHERE slug = ANY(ARRAY['the-grand-terrace', 'the-glasshouse-estate', 'the-foundry-loft', 'rosewood-pavilion', 'azure-grand-hall', 'the-glass-garden', 'the-blue-leaf-filipinas', 'hillcreek-gardens-tagaytay', 'caleruega-church-and-retreat-center', 'villa-escudero-plantations-and-resort', 'jardin-de-miramar-events-venue', 'fontana-leisure-parks', 'marco-polo-plaza-cebu', 'amorita-resort', 'astoria-palawan', 'pearl-farm-beach-resort', 'john-hay-hotels-(garden-wing-formerly-the-manor)-at-camp-john-hay']::text[]);

-- Lookup values from venues.json
INSERT INTO public.venue_categories (name, slug) VALUES
  ('Beach', 'beach'),
  ('Beach Resort', 'beach-resort'),
  ('Beach Resort & Convention Center', 'beach-resort-convention-center'),
  ('Church', 'church'),
  ('Church with Reception Venue', 'church-with-reception-venue'),
  ('Function Hall', 'function-hall'),
  ('Garden', 'garden'),
  ('Garden Event Venue', 'garden-event-venue'),
  ('Garden Resort & Hotel', 'garden-resort-hotel'),
  ('Garden Venue', 'garden-venue'),
  ('Heritage Resort & Private Estate', 'heritage-resort-private-estate'),
  ('Hotel', 'hotel'),
  ('Hotel & Convention Venue', 'hotel-convention-venue'),
  ('Luxury Beach Resort', 'luxury-beach-resort'),
  ('Mountain Resort Hotel', 'mountain-resort-hotel'),
  ('Resort', 'resort'),
  ('Resort & Convention Center', 'resort-convention-center')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.event_types (name, slug) VALUES
  ('Anniversary', 'anniversary'),
  ('Birthday', 'birthday'),
  ('Church Ceremony', 'church-ceremony'),
  ('Conference', 'conference'),
  ('Convention', 'convention'),
  ('Corporate Event', 'corporate-event'),
  ('Corporate Retreat', 'corporate-retreat'),
  ('Cultural Event', 'cultural-event'),
  ('Debut', 'debut'),
  ('Destination Wedding', 'destination-wedding'),
  ('Gala', 'gala'),
  ('Honeymoon Event', 'honeymoon-event'),
  ('Retreat', 'retreat'),
  ('Seminar', 'seminar'),
  ('Staycation Event', 'staycation-event'),
  ('Team Building', 'team-building'),
  ('Wedding', 'wedding')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.amenities (name) VALUES
  ('Air Conditioning'),
  ('Beachfront'),
  ('Chairs Included'),
  ('Garden'),
  ('LED Wall'),
  ('Overnight Accommodation'),
  ('Parking'),
  ('Projector'),
  ('Security'),
  ('Sound System'),
  ('Stage'),
  ('Swimming Pool'),
  ('Tables Included'),
  ('WiFi')
ON CONFLICT (name) DO NOTHING;

-- The Blue Leaf Filipinas
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '758c437f-6a9c-434a-a5aa-e6290787bd7f', '80000000-0000-0000-0000-000000000001', 'The Blue Leaf Filipinas', 'the-blue-leaf-filipinas', 'The Blue Leaf Filipinas is one of Metro Manila''s most established wedding and event venues, known for its distinctive avant-garde Filipino architecture set among landscaped gardens and waterfalls in Aseana City, Parañaque. The venue offers a main garden for cocktail hours, a high-ceiling indoor hall for receptions, and a roof deck for outdoor ceremonies, accommodating events from 50 to over 1,000 guests across its function spaces.', NULL,
  'Metro Manila', 'Parañaque City', 'Parañaque City', '1702 Belle Avenue, Aseana City, Tambo, Parañaque City, Metro Manila', 14.5075, 120.9847,
  50, 1000, 80000, 'per_event', 'both',
  true, true, false, false,
  false, false, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', 'https://www.theblueleaf.com/wp-content/uploads/2022/04/hero.jpeg', 'image', 'The Blue Leaf Filipinas photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', 'https://www.theblueleaf.com/wp-content/uploads/2025/08/DSCF1311.webp', 'image', 'The Blue Leaf Filipinas photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', 'https://www.theblueleaf.com/wp-content/uploads/2025/08/DSCF1339.webp', 'image', 'The Blue Leaf Filipinas photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', 'https://www.theblueleaf.com/wp-content/uploads/2025/08/cosmopolitan-gallery.png', 'image', 'The Blue Leaf Filipinas photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', 'https://www.theblueleaf.com/wp-content/uploads/2025/08/cosmopolitan-gallery-2.png', 'image', 'The Blue Leaf Filipinas photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('2dd02a54-5328-417b-9ebd-84f1e8ba0ad3', '758c437f-6a9c-434a-a5aa-e6290787bd7f', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 64000, 'per_event', 50, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('9ca95424-4f30-41ff-adfa-580e1a924fed', '758c437f-6a9c-434a-a5aa-e6290787bd7f', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 50, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('c04feea7-f8b3-42be-ae08-d310bc0ce02d', '758c437f-6a9c-434a-a5aa-e6290787bd7f', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 112000, 'per_event', 50, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.venue_categories WHERE slug = 'garden-event-venue' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.venue_categories WHERE slug = 'function-hall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.event_types WHERE slug = 'debut' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.event_types WHERE slug = 'birthday' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.event_types WHERE slug = 'anniversary' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'LED Wall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Projector' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Stage' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '758c437f-6a9c-434a-a5aa-e6290787bd7f', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('758c437f-6a9c-434a-a5aa-e6290787bd7f', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Hillcreek Gardens Tagaytay
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '1c138672-bffe-4462-abd9-728ccef680b8', '80000000-0000-0000-0000-000000000001', 'Hillcreek Gardens Tagaytay', 'hillcreek-gardens-tagaytay', 'Hillcreek Gardens Tagaytay is a one-stop wedding destination set on a 3.2-hectare working coffee farm and private family estate in Alfonso, Cavite, just minutes from Tagaytay City. Established in 2008, the property has grown to include the Grand Ballroom, The Pavilion, a garden ceremony area, an on-site hotel, and its own restaurant, making it popular for weddings, corporate events, and staycations alike.', NULL,
  'Cavite', 'Alfonso', 'Alfonso', '134 Tagaytay-Alfonso Road, Brgy. Sikat, Alfonso, 4123 Cavite', 14.1372, 120.8494,
  50, 700, 80000, 'per_event', 'both',
  true, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', 'https://www.hillcreekgardenstagaytay.com/wp-content/uploads/2022/03/EVENTS-MAIN-edited.jpg', 'image', 'Hillcreek Gardens Tagaytay photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', 'https://www.hillcreekgardenstagaytay.com/wp-content/uploads/2022/03/EVENTS-3-edited.jpg', 'image', 'Hillcreek Gardens Tagaytay photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', 'https://www.hillcreekgardenstagaytay.com/wp-content/uploads/2022/03/EVENTS-4-edited.jpg', 'image', 'Hillcreek Gardens Tagaytay photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', 'https://www.hillcreekgardenstagaytay.com/wp-content/uploads/2022/03/EVENTS-2-edited.jpg', 'image', 'Hillcreek Gardens Tagaytay photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', 'https://www.hillcreekgardenstagaytay.com/wp-content/uploads/2022/03/HOTEL-MAIN-edited.jpg', 'image', 'Hillcreek Gardens Tagaytay photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('aa3f44eb-a2c2-460d-b15c-a39b0ef81f4a', '1c138672-bffe-4462-abd9-728ccef680b8', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 64000, 'per_event', 50, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('f3d464a6-892e-4dde-9bcb-90777ec2944a', '1c138672-bffe-4462-abd9-728ccef680b8', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 50, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('4b929796-1e8b-47a7-b78a-35c7355837a1', '1c138672-bffe-4462-abd9-728ccef680b8', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 112000, 'per_event', 50, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.venue_categories WHERE slug = 'garden-resort-hotel' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.venue_categories WHERE slug = 'hotel' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.event_types WHERE slug = 'team-building' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.event_types WHERE slug = 'debut' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.event_types WHERE slug = 'staycation-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'LED Wall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Projector' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Stage' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1c138672-bffe-4462-abd9-728ccef680b8', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('1c138672-bffe-4462-abd9-728ccef680b8', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Caleruega Church & Retreat Center
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '7cb27866-7040-4572-b7d2-cef957f7a2c6', '80000000-0000-0000-0000-000000000001', 'Caleruega Church & Retreat Center', 'caleruega-church-and-retreat-center', 'Named after the birthplace of St. Dominic de Guzman, Caleruega is a Dominican-run retreat and events complex perched on a hill in Nasugbu, Batangas, with panoramic views of Mt. Batulao and the surrounding countryside. Its Transfiguration Chapel is one of the most in-demand wedding churches near Tagaytay, and the grounds include several reception venues (Plaza de Aza, Veritas Hall, Gazekubo, and Kampo Arriba) that can each be booked for the reception that follows.', NULL,
  'Batangas', 'Nasugbu', 'Nasugbu', 'Caleruega Road, Brgy. Kaylaway, Nasugbu, Batangas 4231', 14.0764, 120.7444,
  30, 200, 150000, 'per_event', 'both',
  true, true, false, false,
  false, false, true, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', 'https://www.venuespring.com/media/2023/12/Caleruega-Church-The-Transfiguration-Chapel-6.jpg', 'image', 'Caleruega Church & Retreat Center photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', 'https://www.venuespring.com/media/2023/12/Caleruega-Church-The-Transfiguration-Chapel-3-1200x900.jpg', 'image', 'Caleruega Church & Retreat Center photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', 'https://www.venuespring.com/media/2023/12/Caleruega-Church-The-Transfiguration-Chapel-5.jpg', 'image', 'Caleruega Church & Retreat Center photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', 'https://www.venuespring.com/media/2023/12/Caleruega-Church-The-Transfiguration-Chapel-4-1200x1793.jpg', 'image', 'Caleruega Church & Retreat Center photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', 'https://www.venuespring.com/media/2023/12/Caleruega-Church-The-Transfiguration-Chapel-2-1200x800.jpg', 'image', 'Caleruega Church & Retreat Center photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('575cf977-fb20-488c-b581-68167d6121c7', '7cb27866-7040-4572-b7d2-cef957f7a2c6', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 120000, 'per_event', 30, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('f72ac12c-3ad1-449d-8652-4d323294195b', '7cb27866-7040-4572-b7d2-cef957f7a2c6', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 150000, 'per_event', 30, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('7d1b89d6-95d0-4c0f-a316-cd9594598e91', '7cb27866-7040-4572-b7d2-cef957f7a2c6', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 210000, 'per_event', 30, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.venue_categories WHERE slug = 'church-with-reception-venue' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.venue_categories WHERE slug = 'function-hall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.venue_categories WHERE slug = 'church' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.event_types WHERE slug = 'church-ceremony' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.event_types WHERE slug = 'retreat' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.event_types WHERE slug = 'team-building' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.event_types WHERE slug = 'seminar' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '7cb27866-7040-4572-b7d2-cef957f7a2c6', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('7cb27866-7040-4572-b7d2-cef957f7a2c6', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Villa Escudero Plantations and Resort
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '62cdce36-9589-484f-9141-734930861b1b', '80000000-0000-0000-0000-000000000001', 'Villa Escudero Plantations and Resort', 'villa-escudero-plantations-and-resort', 'Villa Escudero Plantations and Resort is an 800-hectare working coconut plantation and hacienda on the Laguna–Quezon border, opened to the public since 1981. Best known for its Labasin Waterfalls Restaurant where guests dine with their feet in flowing water, the resort also hosts destination weddings and corporate events amid its museum, gardens, and carabao-cart trails, blending Filipino heritage with open-air event spaces.', NULL,
  'Laguna', 'Tiaong (Quezon border, San Pablo, Laguna)', 'Tiaong (Quezon border, San Pablo, Laguna)', 'Villa Escudero, Km. 91, Tiaong, Quezon (bordering San Pablo City, Laguna)', 13.9956, 121.343,
  50, 500, 120000, 'per_event', 'outdoor',
  true, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('62cdce36-9589-484f-9141-734930861b1b', 'https://villaescudero.com/wp-content/uploads/2026/02/church-720x720.jpg', 'image', 'Villa Escudero Plantations and Resort photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('62cdce36-9589-484f-9141-734930861b1b', 'https://villaescudero.com/wp-content/uploads/2022/04/longhouse-unit-aircon-02.jpg', 'image', 'Villa Escudero Plantations and Resort photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('62cdce36-9589-484f-9141-734930861b1b', 'https://villaescudero.com/wp-content/uploads/2026/02/executive-longhouse-unit-aircon-02.jpg', 'image', 'Villa Escudero Plantations and Resort photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('62cdce36-9589-484f-9141-734930861b1b', 'https://villaescudero.com/wp-content/uploads/2026/02/riverside-cottage-02.jpg', 'image', 'Villa Escudero Plantations and Resort photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('62cdce36-9589-484f-9141-734930861b1b', 'https://villaescudero.com/wp-content/uploads/2026/02/executive-riverside-cottage-01.jpg', 'image', 'Villa Escudero Plantations and Resort photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('61ed0354-79f9-43f8-aa86-12e3f0e83970', '62cdce36-9589-484f-9141-734930861b1b', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 96000, 'per_event', 50, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('5bf7e68a-42ff-4329-8c40-a055ad5502c6', '62cdce36-9589-484f-9141-734930861b1b', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 120000, 'per_event', 50, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('2829c506-3766-4b7e-882f-b6ba64459112', '62cdce36-9589-484f-9141-734930861b1b', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 168000, 'per_event', 50, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.venue_categories WHERE slug = 'heritage-resort-private-estate' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.event_types WHERE slug = 'destination-wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.event_types WHERE slug = 'team-building' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.event_types WHERE slug = 'cultural-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'LED Wall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Projector' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Stage' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '62cdce36-9589-484f-9141-734930861b1b', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('62cdce36-9589-484f-9141-734930861b1b', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Jardin de Miramar Events Venue
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '03894748-3793-4702-8a99-c44c93d1d32b', '80000000-0000-0000-0000-000000000001', 'Jardin de Miramar Events Venue', 'jardin-de-miramar-events-venue', 'Jardin de Miramar is a three-hectare garden events complex in Antipolo City, Rizal, with more than 15 years of experience hosting weddings, debuts, and corporate events. The property features several themed venues — including Sevilla, Ylang-Ylang, and Estacion — set among landscaped gardens, sculptures, and mountain views, and also houses the Casa Santa Museum on the same grounds.', NULL,
  'Rizal', 'Antipolo City', 'Antipolo City', '276 San Jose Ext., Brgy. San Isidro, Antipolo City, 1870 Rizal', 14.6255, 121.1793,
  50, 300, 120000, 'per_event', 'outdoor',
  true, true, false, false,
  false, false, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', 'https://cdn.jardindemiramareventsvenue.com/m/d9d881d9-ed96-46fd-b188-285591e0e9f7/w1600.webp', 'image', 'Jardin de Miramar Events Venue photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', 'https://cdn.jardindemiramareventsvenue.com/og/pages/37a8eec1ce19687d/home.png', 'image', 'Jardin de Miramar Events Venue photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', 'https://cdn.jardindemiramareventsvenue.com/m/c84ae038-e621-45c0-ba81-ff209cc09f42/w640.webp', 'image', 'Jardin de Miramar Events Venue photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', 'https://cdn.jardindemiramareventsvenue.com/m/eb75c001-799a-41d5-8b4e-7aa99f09de47/w640.webp', 'image', 'Jardin de Miramar Events Venue photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', 'https://cdn.jardindemiramareventsvenue.com/m/8c40088d-a60b-4e70-9ce9-d48f9e3330b0/w640.webp', 'image', 'Jardin de Miramar Events Venue photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('c9bdb28b-7c61-4d76-82dc-9f89887b4480', '03894748-3793-4702-8a99-c44c93d1d32b', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 96000, 'per_event', 50, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('941fcf4e-70a6-4205-8aaf-d11b96049cba', '03894748-3793-4702-8a99-c44c93d1d32b', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 120000, 'per_event', 50, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('c66c6ac8-1f74-4aac-a34f-72cf8bc5b490', '03894748-3793-4702-8a99-c44c93d1d32b', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 168000, 'per_event', 50, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.venue_categories WHERE slug = 'garden-venue' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.venue_categories WHERE slug = 'function-hall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.event_types WHERE slug = 'debut' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.event_types WHERE slug = 'birthday' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.event_types WHERE slug = 'seminar' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '03894748-3793-4702-8a99-c44c93d1d32b', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('03894748-3793-4702-8a99-c44c93d1d32b', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Fontana Leisure Parks
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '1481ff16-7ad3-4781-bfd6-08c367c5948a', '80000000-0000-0000-0000-000000000001', 'Fontana Leisure Parks', 'fontana-leisure-parks', 'Fontana Leisure Parks is a 300-hectare American-planned resort estate within the Clark Freeport Zone in Pampanga, offering hot-spring and wave pools, over 480 villas, and 70 hotel rooms. Its Fontana Convention Center has hosted major gatherings including APEC 2015 and the 2019 SEA Games, with nine flexible function rooms ranging from 30- to 200-person capacity, making it a popular choice for weddings, conventions, and corporate events in Central Luzon.', NULL,
  'Pampanga', 'Clark Freeport Zone, Mabalacat', 'Clark Freeport Zone, Mabalacat', 'C.M. Recto Highway, Clark Freeport Zone, Pampanga 2023', 15.183, 120.556,
  30, 1000, 80000, 'per_event', 'both',
  true, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', 'https://images.cvent.com/CSN/7aaa2b3d-20d4-40e2-90c8-38d97bc43c62/images/affe0716dbb742469943d32c71540f96!_!f911004518e71a51b4330e50b2928ff2.png?d=1200', 'image', 'Fontana Leisure Parks photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', 'https://images.cvent.com/CSN/7aaa2b3d-20d4-40e2-90c8-38d97bc43c62/images/cddaac76e12641adb55ed234347a1a53!_!dc2e1e00fb3d3d66c9e200e25db316de.png?d=1200', 'image', 'Fontana Leisure Parks photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', 'https://images.cvent.com/CSN/7aaa2b3d-20d4-40e2-90c8-38d97bc43c62/images/65c4268b53d24fcfa9add005e6a4a179!_!8704ed7ad1e0f3e45157ebc8d087ec9c.png?d=1200', 'image', 'Fontana Leisure Parks photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', 'https://images.cvent.com/CSN/7aaa2b3d-20d4-40e2-90c8-38d97bc43c62/images/239b3b5f58c54bb0bd279781d483761c!_!d799ef580e3ce00ce9c796dc06dfe9aa.png?d=1200', 'image', 'Fontana Leisure Parks photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', 'https://images.cvent.com/CSN/7aaa2b3d-20d4-40e2-90c8-38d97bc43c62/images/68f10c8989cc469fbe108e40e26aa991!_!e00d03653b55cae732cfb2b9a0122ce6.png?d=1200', 'image', 'Fontana Leisure Parks photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('f67c7044-7319-4c86-a207-a130a7fb9796', '1481ff16-7ad3-4781-bfd6-08c367c5948a', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 64000, 'per_event', 30, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('63dd2ffa-4685-479b-ac1b-ddf6f0715b67', '1481ff16-7ad3-4781-bfd6-08c367c5948a', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 30, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('e4d6fa92-b6ec-421a-96e2-7fdbbb00bbc7', '1481ff16-7ad3-4781-bfd6-08c367c5948a', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 112000, 'per_event', 30, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.venue_categories WHERE slug = 'resort-convention-center' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.event_types WHERE slug = 'convention' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.event_types WHERE slug = 'conference' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.event_types WHERE slug = 'team-building' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'LED Wall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Projector' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Stage' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '1481ff16-7ad3-4781-bfd6-08c367c5948a', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('1481ff16-7ad3-4781-bfd6-08c367c5948a', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Marco Polo Plaza Cebu
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '31359e89-5719-483c-93ae-eb04ccf64a6f', '80000000-0000-0000-0000-000000000001', 'Marco Polo Plaza Cebu', 'marco-polo-plaza-cebu', 'Marco Polo Plaza Cebu is a landmark 5-star hotel on Nivel Hills in Cebu City, originally opened in 1983. Its Cebu Grand Ballroom is a pillarless space accommodating up to 1,200 guests and can be subdivided for smaller functions, while the adjoining Grand Balcony offers panoramic city views for up to 1,500 guests at outdoor receptions. The hotel''s 329 rooms and eight additional function rooms make it a preferred choice for weddings, conferences, and conventions in the Visayas.', NULL,
  'Cebu', 'Cebu City', 'Cebu City', 'Cebu Veterans Drive, Nivel Hills, Apas, Cebu City, Cebu', 10.332, 123.908,
  50, 1200, 150000, 'per_event', 'both',
  true, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', 'https://www.marcopolohotels.com/getmedia/ece201fd-7d3f-423f-b01b-a26ee7b890c5/Mppc-exterior-desktop-size-1920x940px.jpg?width=1920&height=940&ext=.jpg', 'image', 'Marco Polo Plaza Cebu photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', 'https://images.cvent.com/CSN/c1d97397-27ff-451a-b768-4b566fbe0109/images/210f955516234cbfbc5a68a9ec5e7518_LARGE!_!3bbd2242d372c7bfe914e21b9d0b5a98.jpg?d=1200', 'image', 'Marco Polo Plaza Cebu photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', 'https://images.cvent.com/CSN/c1d97397-27ff-451a-b768-4b566fbe0109/images/98e4de6db1f842a6aa0f1c3ca762bd0c_LARGE!_!5224e88ac229745395bfeff9ecaabd03.jpg?d=1200', 'image', 'Marco Polo Plaza Cebu photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', 'https://images.cvent.com/CSN/c1d97397-27ff-451a-b768-4b566fbe0109/images/fc6a2767ce404669ad4b4de34884bb9c_LARGE!_!7d3fc09e7e407e1efa7a757dd97e8381.jpg?d=1200', 'image', 'Marco Polo Plaza Cebu photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', 'https://www.marcopolohotels.com/getmedia/9179cccb-71c3-420f-9de4-a99d572b4d8d/Meetings-Set-Up-Desktop.jpg?width=1920&height=940&ext=.jpg', 'image', 'Marco Polo Plaza Cebu photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('39841960-312d-4d9a-a8e0-97f92230f7ed', '31359e89-5719-483c-93ae-eb04ccf64a6f', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 120000, 'per_event', 50, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('24d3d863-ef2e-4c48-9d7c-b74be2a4b1f7', '31359e89-5719-483c-93ae-eb04ccf64a6f', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 150000, 'per_event', 50, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('c5de6c5d-7127-482c-b68f-56b78ab70ad2', '31359e89-5719-483c-93ae-eb04ccf64a6f', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 210000, 'per_event', 50, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.venue_categories WHERE slug = 'hotel-convention-venue' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.venue_categories WHERE slug = 'hotel' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.venue_categories WHERE slug = 'function-hall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.event_types WHERE slug = 'conference' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.event_types WHERE slug = 'convention' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.event_types WHERE slug = 'gala' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'LED Wall' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Projector' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Stage' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '31359e89-5719-483c-93ae-eb04ccf64a6f', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('31359e89-5719-483c-93ae-eb04ccf64a6f', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Amorita Resort
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  'd131d99a-5300-4de4-a23f-03abf6c61c1d', '80000000-0000-0000-0000-000000000001', 'Amorita Resort', 'amorita-resort', 'Amorita Resort sits atop a limestone cliff on Panglao Island, Bohol, offering sweeping views of the Bohol Sea. The multi-award-winning boutique resort has 98 rooms, suites, and villas, two infinity pools, and several distinct wedding spaces — including the Cliff Deck for sunset ceremonies and poolside areas for receptions — making it a favored destination-wedding venue for couples wanting an island backdrop.', NULL,
  'Bohol', 'Panglao Island', 'Panglao Island', '1 Ester A. Lim Drive, Brgy. Tawala, Panglao Island, Bohol 6340', 9.547, 123.762,
  20, 150, 80000, 'per_event', 'outdoor',
  false, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', 'https://images.squarespace-cdn.com/content/v1/6632f53a115e9d5c41defdab/672a0dfe-a6b7-45cc-9c45-e5eaf1c8f341/Overlooking+Alona+Beach%2C+Amorita+Resort%2C+Panglao+Bohol.jpg', 'image', 'Amorita Resort photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', 'https://images.squarespace-cdn.com/content/v1/6632f53a115e9d5c41defdab/d1e97270-5b39-41ca-a57b-b843b283f045/DSC06043+copy.jpg?format=1500w', 'image', 'Amorita Resort photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', 'https://images.squarespace-cdn.com/content/v1/6632f53a115e9d5c41defdab/330a5dcc-feb5-49cc-a8ff-cd730e1915d6/DSC00857.jpg?format=1500w', 'image', 'Amorita Resort photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', 'https://images.squarespace-cdn.com/content/v1/6632f53a115e9d5c41defdab/76c77a12-166e-4664-a9b6-6b70aaec5494/flower+2.png?format=1500w', 'image', 'Amorita Resort photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', 'https://images.squarespace-cdn.com/content/v1/6632f53a115e9d5c41defdab/d1e97270-5b39-41ca-a57b-b843b283f045/DSC06043+copy.jpg?format=1000w', 'image', 'Amorita Resort photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('96107b85-7dbc-4442-932c-c1790b5eae44', 'd131d99a-5300-4de4-a23f-03abf6c61c1d', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 64000, 'per_event', 20, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('11ca398e-c696-4fbc-9580-ad883969425b', 'd131d99a-5300-4de4-a23f-03abf6c61c1d', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 20, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('66b44eb5-6898-4198-813a-ae5009a493cd', 'd131d99a-5300-4de4-a23f-03abf6c61c1d', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 112000, 'per_event', 20, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.venue_categories WHERE slug = 'beach-resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.venue_categories WHERE slug = 'beach' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.event_types WHERE slug = 'destination-wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.event_types WHERE slug = 'honeymoon-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.event_types WHERE slug = 'corporate-retreat' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Beachfront' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd131d99a-5300-4de4-a23f-03abf6c61c1d', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('d131d99a-5300-4de4-a23f-03abf6c61c1d', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Astoria Palawan
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', '80000000-0000-0000-0000-000000000001', 'Astoria Palawan', 'astoria-palawan', 'Astoria Palawan is a beachfront resort set in a mango orchard about 90 minutes north of Puerto Princesa International Airport, fronting a 464-meter stretch of the Sulu Sea. Beyond its beach ceremony areas, the resort''s Mangrove Conference & Convention Center is a 439-square-meter, solar-powered facility with a main hall for up to 450 guests plus smaller breakout rooms, making Astoria a dual-purpose venue for both destination weddings and MICE events.', NULL,
  'Palawan', 'Puerto Princesa City', 'Puerto Princesa City', 'Kilometer 62, North National Highway, Brgy. San Rafael, Puerto Princesa City, Palawan 5300', 10.043, 118.942,
  30, 450, 80000, 'per_event', 'both',
  false, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'https://astoriapalawan.com/wp-content/uploads/2020/03/Annex-Rooms.jpg', 'image', 'Astoria Palawan photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'https://astoriapalawan.com/wp-content/uploads/2020/03/villa-rooms.jpg', 'image', 'Astoria Palawan photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'https://astoriapalawan.com/wp-content/uploads/2021/09/apw-the-reserve-restaurant.jpg', 'image', 'Astoria Palawan photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'https://astoriapalawan.com/wp-content/uploads/2020/03/annex-rooms-mobile.jpg', 'image', 'Astoria Palawan photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'https://astoriapalawan.com/wp-content/uploads/2021/08/reserve1.jpg', 'image', 'Astoria Palawan photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('dd0af6c9-e021-4830-a176-84613a80c191', '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 64000, 'per_event', 30, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('47e14a64-dcd3-483e-9af7-89df012e4cad', '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 30, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('69e8c287-f426-4256-a268-531513493e58', '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 112000, 'per_event', 30, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.venue_categories WHERE slug = 'beach-resort-convention-center' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.venue_categories WHERE slug = 'beach' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.event_types WHERE slug = 'destination-wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.event_types WHERE slug = 'conference' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.event_types WHERE slug = 'convention' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Beachfront' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT '6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('6de70c44-e4bc-4bcd-8d0b-dad05c0f9b47', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Pearl Farm Beach Resort
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  'c06641ac-96a6-4705-8520-a6f8707346da', '80000000-0000-0000-0000-000000000001', 'Pearl Farm Beach Resort', 'pearl-farm-beach-resort', 'Pearl Farm Beach Resort occupies the site of a former South Sea pearl farm on Samal Island off the coast of Davao City. Designed by National Artist Francisco ''Bobby'' Mañosa, the resort blends indigenous Mindanaoan architecture with beachfront luxury. Its Malipano Pavilion and Torogan Hall host weddings and celebrations for up to roughly 150 guests, with views of Davao Gulf and Mt. Apo in the distance, while five function rooms serve corporate meetings and conferences.', NULL,
  'Davao', 'Island Garden City of Samal', 'Island Garden City of Samal', 'Bo. Adecor, Kaputian District, Island Garden City of Samal, Davao del Norte 8119', 7.009, 125.698,
  30, 150, 150000, 'per_event', 'both',
  false, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', 'https://pearlfarmresort.com/wp-content/uploads/2026/05/Logs3.jpg', 'image', 'Pearl Farm Beach Resort photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', 'https://pearlfarmresort.com/wp-content/uploads/2026/05/424zLmJhX8Iry2R5hBiJUSHZgIDuLnDTZhABnnB9-comp.webp', 'image', 'Pearl Farm Beach Resort photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', 'https://pearlfarmresort.com/wp-content/uploads/2026/03/The-resort-BG.webp', 'image', 'Pearl Farm Beach Resort photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', 'https://pearlfarmresort.com/wp-content/uploads/2026/05/8MeZgcnxIesn3OWFIGLqMPq1HFVtnJWs748IwJsw-comp.webp', 'image', 'Pearl Farm Beach Resort photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', 'https://pearlfarmresort.com/wp-content/uploads/2026/04/image-18-comp-1.webp', 'image', 'Pearl Farm Beach Resort photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('df3d244e-4a02-471d-9c71-d893b3bc70b9', 'c06641ac-96a6-4705-8520-a6f8707346da', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 120000, 'per_event', 30, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('4205c14b-1872-4311-93be-44d89bb86dff', 'c06641ac-96a6-4705-8520-a6f8707346da', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 150000, 'per_event', 30, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('e0887cf1-121a-4caf-8142-cce315ea7de1', 'c06641ac-96a6-4705-8520-a6f8707346da', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 210000, 'per_event', 30, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.venue_categories WHERE slug = 'luxury-beach-resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.venue_categories WHERE slug = 'beach' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.event_types WHERE slug = 'destination-wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.event_types WHERE slug = 'conference' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Beachfront' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'c06641ac-96a6-4705-8520-a6f8707346da', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('c06641ac-96a6-4705-8520-a6f8707346da', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay
INSERT INTO public.venues (
  id, organization_id, name, slug, description, ai_generated_description,
  province, city, municipality, address, latitude, longitude,
  capacity_min, capacity_max, base_price, price_unit, indoor_outdoor,
  air_conditioned, parking_available, overnight_accommodation, pet_friendly,
  wheelchair_accessible, has_pool, ceremony_venue, reception_venue,
  cancellation_policy, venue_rules, status, is_featured, avg_rating, review_count
) VALUES (
  'd836ba8d-64af-436e-a91d-f7e46d5e79ee', '80000000-0000-0000-0000-000000000001', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay', 'john-hay-hotels-(garden-wing-formerly-the-manor)-at-camp-john-hay', 'Formerly known as The Manor, the Garden Wing of John Hay Hotels is a four-storey mountain-chalet-style hotel within the 246-hectare Camp John Hay estate in Baguio City. Surrounded by pine forest and framed by the Cordillera mountain range, the property offers ballrooms, garden lawns, and pine-lined terraces for weddings, corporate off-sites, and conferences, taking advantage of Baguio''s cool climate for outdoor garden ceremonies.', NULL,
  'Baguio', 'Baguio City', 'Baguio City', 'Loakan Road, Camp John Hay, Baguio City, Benguet 2600', 16.389, 120.618,
  30, 400, 100000, 'per_event', 'both',
  true, true, true, false,
  false, true, false, true,
  'Varies by venue — confirm directly; many Philippine venues apply a non-refundable reservation fee', 'Typically 50% down payment upon booking, balance due before event date — confirm exact terms with venue December–May and weekends typically carry premium rates June–November weekdays typically offer lower rates ESTIMATED RANGE based on comparable published venue rates in the same category/region as of the 2026 collection date. This is NOT a confirmed rate from the venue — always verify directly before quoting to customers.', 'published', true, 0, 0
);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', 'https://johnhayhotels.com/wp-content/uploads/2025/09/collage_img-min-editedv3.jpg', 'image', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay photo 1', 0, true);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', 'https://johnhayhotels.com/wp-content/uploads/2025/09/garding-wing-xmas-09-20251.jpg', 'image', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay photo 2', 1, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', 'https://johnhayhotels.com/wp-content/uploads/2025/11/home-forest-wing-optimized.jpg', 'image', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay photo 3', 2, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', 'https://johnhayhotels.com/wp-content/uploads/2025/06/A3.jpg', 'image', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay photo 4', 3, false);
INSERT INTO public.venue_images (venue_id, storage_path, media_type, alt_text, display_order, is_featured) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', 'https://johnhayhotels.com/wp-content/uploads/2025/06/A2.jpg', 'image', 'John Hay Hotels (Garden Wing, formerly The Manor) at Camp John Hay photo 5', 4, false);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('3ee36ec0-ce82-4f75-b47e-253b17b9c6c2', 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', 'Silver Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 80000, 'per_event', 30, 80, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('d978ff2b-e044-428a-a228-ef640a8b793f', 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', 'Gold Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 100000, 'per_event', 30, 100, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_packages (id, venue_id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active) VALUES ('0ebef16b-6058-45a4-806f-3b30e7dd39c5', 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', 'Premium Package', 'ESTIMATED — based on comparable published venue rates, not a confirmed quote from this venue', 140000, 'per_event', 30, 140, ARRAY['Venue rental (standard hours as posted by venue)', 'Basic tables and chairs', 'Basic sound system', 'Standard lighting', 'Bridal/VIP room access', 'LED wall', 'Extended hours', 'Catering upgrade', 'Additional hours', 'Outside caterer corkage', 'Styling/décor package']::text[], true);
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.venue_categories WHERE slug = 'mountain-resort-hotel' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.venue_categories WHERE slug = 'garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.venue_categories WHERE slug = 'resort' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_category_assignments (venue_id, category_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.venue_categories WHERE slug = 'hotel' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.event_types WHERE slug = 'wedding' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.event_types WHERE slug = 'corporate-event' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.event_types WHERE slug = 'conference' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.event_types WHERE slug = 'team-building' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_event_types (venue_id, event_type_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.event_types WHERE slug = 'debut' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Air Conditioning' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Chairs Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Garden' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Overnight Accommodation' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Parking' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Security' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Sound System' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Swimming Pool' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'Tables Included' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_amenities (venue_id, amenity_id) SELECT 'd836ba8d-64af-436e-a91d-f7e46d5e79ee', id FROM public.amenities WHERE name = 'WiFi' ON CONFLICT DO NOTHING;
INSERT INTO public.venue_embeddings (venue_id, embedding) VALUES ('d836ba8d-64af-436e-a91d-f7e46d5e79ee', NULL) ON CONFLICT (venue_id) DO UPDATE SET embedding = NULL, updated_at = now();

-- Global Commission Rule
INSERT INTO public.commission_rules (id, scope, percentage, effective_from) VALUES
  ('90000000-0000-0000-0000-000000000001', 'global', 10.00, '2026-01-01')
ON CONFLICT (id) DO UPDATE SET percentage = EXCLUDED.percentage, effective_from = EXCLUDED.effective_from;

COMMIT;
