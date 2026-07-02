const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log('🌱 Seeding sample venue records...\n');

  // ── Step 1: Get lookup IDs ────────────────────────────────
  const { data: categories } = await supabase.from('venue_categories').select('id, slug');
  const { data: eventTypes }  = await supabase.from('event_types').select('id, slug');
  const { data: amenities }   = await supabase.from('amenities').select('id, name');

  const catId  = (slug) => categories?.find(c => c.slug === slug)?.id;
  const etId   = (slug) => eventTypes?.find(e => e.slug === slug)?.id;
  const amenId = (name) => amenities?.find(a => a.name === name)?.id;

  console.log(`  Found ${categories?.length ?? 0} categories, ${eventTypes?.length ?? 0} event types, ${amenities?.length ?? 0} amenities`);

  // ── Step 2: Find an existing venue_owner + their organization ──
  const { data: venueOwnerRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'venue_owner')
    .limit(1);

  if (!venueOwnerRoles?.length) {
    console.error('❌ No venue_owner found in user_roles. Please register a venue owner account first.');
    process.exit(1);
  }

  const ownerUserId = venueOwnerRoles[0].user_id;
  console.log(`  Using venue owner: ${ownerUserId}`);

  // Find or create their organization
  let { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', ownerUserId)
    .limit(1);

  let orgId;
  if (existingOrg?.length) {
    orgId = existingOrg[0].id;
    console.log(`  Using existing organization: ${orgId}`);
  } else {
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({ owner_id: ownerUserId, name: 'Venora Demo Venues' })
      .select('id')
      .single();
    if (orgError) {
      console.error('❌ Failed to create organization:', orgError.message);
      process.exit(1);
    }
    orgId = newOrg.id;

    await supabase.from('organization_members').insert({
      organization_id: orgId, user_id: ownerUserId, role: 'owner'
    });
    console.log(`  Created organization: ${orgId}`);
  }


  // ── Step 3: Venue data ────────────────────────────────────────
  const venueData = [
    {
      name: 'The Glasshouse Estate',
      slug: 'the-glasshouse-estate',
      description: 'A breathtaking garden venue surrounded by lush greenery and natural light. Perfect for outdoor ceremonies and elegant receptions.',
      province: 'Cavite',
      city: 'Tagaytay City',
      municipality: 'Tagaytay',
      address: '12 Mahogany Road, Tagaytay City, Cavite',
      latitude: 14.1153,
      longitude: 120.9621,
      capacity_min: 50,
      capacity_max: 300,
      base_price: 120000,
      price_unit: 'per_event',
      indoor_outdoor: 'both',
      air_conditioned: true,
      parking_available: true,
      overnight_accommodation: false,
      pet_friendly: false,
      wheelchair_accessible: true,
      has_pool: false,
      ceremony_venue: true,
      reception_venue: true,
      status: 'published',
      is_featured: true,
      avg_rating: 4.9,
      review_count: 38,
      cancellation_policy: 'Full refund if cancelled 30 days before the event.',
      venue_rules: 'No open flame. No confetti indoors. Strict 11PM curfew.',
      categories: ['garden', 'events-space'],
      eventTypes: ['wedding', 'debut', 'birthday', 'corporate'],
      amenities: ['Air Conditioning','Parking','Bridal Suite','Groom Suite','Sound System','Stage','Dance Floor','Garden Area','Backup Generator'],
      packages: [
        { name: 'Intimate Package', description: 'Perfect for small ceremonies', price: 120000, min_guests: 50, max_guests: 100, inclusions: ['8-hour venue use','Tables & Chairs','Garden lighting','Sound system','Bridal room'] },
        { name: 'Garden Elegance Package', description: 'Our most popular all-inclusive package', price: 185000, min_guests: 100, max_guests: 200, inclusions: ['10-hour venue use','Tables & Chairs for 200','Full garden lighting rig','Premium sound system','LED wall','Bridal & Groom suites','Event coordinator'] },
        { name: 'Grand Estate Package', description: 'The ultimate celebration experience', price: 280000, min_guests: 200, max_guests: 300, inclusions: ['12-hour venue use','Full venue exclusive use','Premium A/V setup','Stage & dance floor','Event coordinator','Bridal & Groom suites','Parking for 150 cars'] },
      ],
    },
    {
      name: 'The Foundry Loft',
      slug: 'the-foundry-loft',
      description: 'An industrial-chic events hall with exposed brick walls, warm Edison lighting, and flexible layout for any occasion.',
      province: 'Metro Manila',
      city: 'Makati City',
      municipality: 'Makati',
      address: '8 Warehouse Row, Brgy. San Lorenzo, Makati City',
      latitude: 14.5547,
      longitude: 121.0244,
      capacity_min: 30,
      capacity_max: 150,
      base_price: 85000,
      price_unit: 'per_event',
      indoor_outdoor: 'indoor',
      air_conditioned: true,
      parking_available: true,
      overnight_accommodation: false,
      pet_friendly: false,
      wheelchair_accessible: true,
      has_pool: false,
      ceremony_venue: false,
      reception_venue: true,
      status: 'published',
      is_featured: false,
      avg_rating: 4.8,
      review_count: 62,
      cancellation_policy: 'Non-refundable deposit of 30%. Balance refundable 14 days before.',
      venue_rules: 'No outside catering. Music must end by 10PM.',
      categories: ['function-hall', 'events-space'],
      eventTypes: ['corporate', 'birthday', 'reunion', 'product-launch'],
      amenities: ['Air Conditioning','Parking','Sound System','LED Wall','Projector','Bar Area','Catering Kitchen','Backup Generator'],
      packages: [
        { name: 'Loft Basic', description: 'Essential package for corporate events', price: 85000, min_guests: 30, max_guests: 80, inclusions: ['6-hour use','Standard A/V','Tables & Chairs','Projector','Basic lighting'] },
        { name: 'Loft Premium', description: 'Full industrial-chic experience', price: 150000, min_guests: 80, max_guests: 150, inclusions: ['8-hour use','LED wall','Premium sound system','Full Edison lighting rig','Bar setup','Tables & Chairs for 150'] },
      ],
    },
    {
      name: 'Villa Serena Batangas',
      slug: 'villa-serena-batangas',
      description: 'A picturesque beachfront resort villa with its own private shoreline. Ideal for destination weddings and overnight celebrations.',
      province: 'Batangas',
      city: 'Nasugbu',
      municipality: 'Nasugbu',
      address: 'Km. 82 National Road, Nasugbu, Batangas',
      latitude: 14.0664,
      longitude: 120.6381,
      capacity_min: 80,
      capacity_max: 400,
      base_price: 250000,
      price_unit: 'per_event',
      indoor_outdoor: 'both',
      air_conditioned: true,
      parking_available: true,
      overnight_accommodation: true,
      pet_friendly: true,
      wheelchair_accessible: false,
      has_pool: true,
      ceremony_venue: true,
      reception_venue: true,
      status: 'published',
      is_featured: true,
      avg_rating: 4.95,
      review_count: 21,
      cancellation_policy: '50% refund if cancelled 60 days prior.',
      venue_rules: 'Pets must be leashed. No fireworks.',
      categories: ['beach', 'resort'],
      eventTypes: ['wedding', 'debut', 'birthday', 'reunion'],
      amenities: ['Air Conditioning','Parking','Swimming Pool','Bridal Suite','Groom Suite','Overnight Accommodation','Bar Area','Catering Kitchen','Dance Floor','Stage','Garden Area'],
      packages: [
        { name: 'Beach Ceremony Package', description: 'Exclusive ceremony by the sea', price: 250000, min_guests: 80, max_guests: 200, inclusions: ['Private beach access','10-hour venue use','Ceremony setup','Sound system','Tables & Chairs','Bridal villa'] },
        { name: 'Destination Wedding Bundle', description: 'Full 2-day beachfront takeover', price: 480000, min_guests: 150, max_guests: 400, inclusions: ['2-day exclusive villa access','Overnight accommodations (10 rooms)','Pool & beach access','Full A/V production','Event coordinator','Bridal & Groom suites'] },
      ],
    },
    {
      name: 'Sky Deck at One Meridian',
      slug: 'sky-deck-one-meridian',
      description: 'A stunning rooftop events space on the 42nd floor of One Meridian Tower, overlooking the entire BGC skyline.',
      province: 'Metro Manila',
      city: 'Taguig City',
      municipality: 'Taguig',
      address: '1 Meridian Way, Bonifacio Global City, Taguig',
      latitude: 14.5508,
      longitude: 121.0501,
      capacity_min: 20,
      capacity_max: 200,
      base_price: 180000,
      price_unit: 'per_event',
      indoor_outdoor: 'outdoor',
      air_conditioned: false,
      parking_available: true,
      overnight_accommodation: false,
      pet_friendly: false,
      wheelchair_accessible: true,
      has_pool: false,
      ceremony_venue: true,
      reception_venue: true,
      status: 'published',
      is_featured: false,
      avg_rating: 4.7,
      review_count: 15,
      cancellation_policy: 'No refunds within 21 days of the event.',
      venue_rules: 'No heavy equipment. Strict 50-person max for open-air ceremonies.',
      categories: ['rooftop', 'events-space'],
      eventTypes: ['wedding', 'corporate', 'product-launch', 'birthday'],
      amenities: ['Parking','Sound System','LED Wall','Bar Area','Backup Generator'],
      packages: [
        { name: 'Sky View Package', description: 'Daytime event with panoramic views', price: 180000, min_guests: 20, max_guests: 100, inclusions: ['6-hour use','Standard A/V','Cocktail tables','BGC city skyline backdrop'] },
        { name: 'Sunset Premium Package', description: 'Golden hour event experience', price: 280000, min_guests: 50, max_guests: 200, inclusions: ['8-hour use','Sunset timing slot','Premium sound system','LED wall','Bar setup','Full event styling'] },
      ],
    },
    {
      name: 'Hacienda Buenas Noches',
      slug: 'hacienda-buenas-noches',
      description: 'A romantic Spanish-colonial hacienda on 3 hectares of farmland. Complete with a stone chapel, cobblestone courtyard, and sprawling lawns.',
      province: 'Bulacan',
      city: 'Malolos City',
      municipality: 'Malolos',
      address: 'Hacienda Road, Brgy. Longos, Malolos, Bulacan',
      latitude: 14.8527,
      longitude: 120.8131,
      capacity_min: 100,
      capacity_max: 500,
      base_price: 95000,
      price_unit: 'per_event',
      indoor_outdoor: 'both',
      air_conditioned: true,
      parking_available: true,
      overnight_accommodation: true,
      pet_friendly: true,
      wheelchair_accessible: true,
      has_pool: false,
      ceremony_venue: true,
      reception_venue: true,
      status: 'published',
      is_featured: true,
      avg_rating: 4.85,
      review_count: 47,
      cancellation_policy: 'Full refund 45 days before event, 50% refund 14-45 days.',
      venue_rules: 'Amplified music ends at midnight. No motorized vehicles on lawn.',
      categories: ['garden', 'farm', 'church'],
      eventTypes: ['wedding', 'debut', 'reunion', 'birthday', 'graduation'],
      amenities: ['Air Conditioning','Parking','Bridal Suite','Groom Suite','Sound System','Stage','Dance Floor','Garden Area','Overnight Accommodation','Catering Kitchen','Backup Generator'],
      packages: [
        { name: 'Hacienda Garden Package', description: 'Classic garden celebration', price: 95000, min_guests: 100, max_guests: 250, inclusions: ['8-hour venue use','Tables & Chairs','Garden lighting','Sound system','Chapel access'] },
        { name: 'Grand Hacienda Package', description: 'Full hacienda experience with overnight stay', price: 195000, min_guests: 200, max_guests: 500, inclusions: ['12-hour venue use','Overnight accommodations (5 rooms)','Full A/V production','Stage & dance floor','Chapel ceremony','Event coordinator','Catering kitchen access'] },
      ],
    },
  ];

  // ── Step 4: Insert each venue and its relations ───────────────
  for (const v of venueData) {
    const { categories: vCats, eventTypes: vETs, amenities: vAmens, packages: vPkgs, ...venueRow } = v;

    // Upsert by slug — let Postgres generate the ID on insert
    const { error: venueError } = await supabase.from('venues').upsert(
      { organization_id: orgId, ...venueRow },
      { onConflict: 'slug' }
    );
    if (venueError) {
      console.error(`❌ Venue "${v.name}":`, venueError.message);
      continue;
    }

    // Fetch the generated/existing venue ID
    const { data: fetchedVenue } = await supabase
      .from('venues').select('id').eq('slug', v.slug).single();
    const actualVenueId = fetchedVenue?.id;

    console.log(`✅ Venue: ${v.name} (${actualVenueId})`);

    // Categories
    for (const slug of vCats) {
      const category_id = catId(slug);
      if (!category_id) { console.warn(`  ⚠️  Category not found: ${slug}`); continue; }
      await supabase.from('venue_category_assignments').upsert({ venue_id: actualVenueId, category_id }, { onConflict: 'venue_id,category_id' });
    }

    // Event types
    for (const slug of vETs) {
      const event_type_id = etId(slug);
      if (!event_type_id) { console.warn(`  ⚠️  Event type not found: ${slug}`); continue; }
      await supabase.from('venue_event_types').upsert({ venue_id: actualVenueId, event_type_id }, { onConflict: 'venue_id,event_type_id' });
    }

    // Amenities
    for (const name of vAmens) {
      const amenity_id = amenId(name);
      if (!amenity_id) { console.warn(`  ⚠️  Amenity not found: ${name}`); continue; }
      await supabase.from('venue_amenities').upsert({ venue_id: actualVenueId, amenity_id }, { onConflict: 'venue_id,amenity_id' });
    }

    // Packages
    for (const pkg of vPkgs) {
      const { error: pkgError } = await supabase.from('venue_packages').insert({ venue_id: actualVenueId, ...pkg });
      if (pkgError && !pkgError.message.includes('duplicate')) {
        console.warn(`  ⚠️  Package "${pkg.name}": ${pkgError.message}`);
      } else {
        console.log(`  📦 Package: ${pkg.name}`);
      }
    }
  }

  console.log('\n🎉 Seeding complete!');
}

seed().catch(console.error);
