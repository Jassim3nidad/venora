import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
const targetFile = process.argv.find(arg => arg.endsWith('.json'));

if (!targetFile) {
  console.error("Usage: node import-immersive-venue-content.mjs <path-to-dataset.json> [--dry-run | --apply]");
  process.exit(1);
}
if (!isDryRun && !isApply) {
  console.error("Must specify either --dry-run or --apply");
  process.exit(1);
}

// Load .env.local
const envPath = path.join(__dirname, "../apps/web/.env.local");
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const fileEnv = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    fileEnv[match[1]] = value;
  }
});
const env = { ...fileEnv, ...process.env };

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

// We don't fail immediately on ECONNREFUSED in dry-run if we can't connect,
// but for a real apply we need it. Let's wrap in a try-catch later.
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function run() {
  const dataset = JSON.parse(fs.readFileSync(path.resolve(targetFile), 'utf8'));
  console.log(`Starting import for: ${dataset.venueSlug}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);

  // Fetch venue
  let { data: venue, error: venueErr } = await adminClient
    .from('venues')
    .select('id, organization_id')
    .eq('slug', dataset.venueSlug)
    .single();

  if (venueErr) {
    console.error(`Failed to find venue with slug: ${dataset.venueSlug}`, venueErr.message);
    if (isDryRun) {
      console.log("Assuming mock venue ID for dry-run...");
      venue = { id: crypto.randomUUID(), organization_id: crypto.randomUUID() };
    } else {
      process.exit(1);
    }
  }

  const venueId = venue.id;

  // We map stable keys to UUIDs
  const spaceKeyToId = {};
  const collectionKeyToId = {};
  const amenityNameToId = {};
  const eventTypeNameToId = {};
  const packageNameToId = {};

  // Fetch lookups
  if (!isDryRun || venueErr === null) {
    const [{ data: amenities }, { data: eventTypes }, { data: packages }] = await Promise.all([
      adminClient.from('amenities').select('id, name'),
      adminClient.from('event_types').select('id, name, slug'),
      adminClient.from('venue_packages').select('id, name').eq('venue_id', venueId)
    ]);
    if (amenities) amenities.forEach(a => amenityNameToId[a.name] = a.id);
    if (eventTypes) eventTypes.forEach(e => eventTypeNameToId[e.name] = e.id);
    if (packages) packages.forEach(p => packageNameToId[p.name] = p.id);
  }

  const logAction = (action, table, details) => {
    console.log(`[${action}] ${table}:`, details);
  };

  // Revision scope
  const revisionId = crypto.randomUUID();
  logAction('CREATE', 'venue_profile_revisions', { venue_id: venueId, id: revisionId, status: 'published' });

  if (isApply) {
    await adminClient.from('venue_profile_revisions').insert({
      id: revisionId,
      venue_id: venueId,
      status: 'published',
      created_by: '00000000-0000-0000-0000-000000000001',
      published_at: new Date().toISOString()
    });
  }

  // Spaces
  for (const space of dataset.spaces) {
    const spaceId = crypto.randomUUID();
    spaceKeyToId[space.spaceKey] = spaceId;
    const payload = {
      id: spaceId,
      venue_id: venueId,
      revision_id: revisionId,
      name: space.name,
      slug: space.slug,
      space_type: space.spaceType,
      setting: space.setting,
      capacity_max: space.capacityMax,
      display_order: space.displayOrder
    };
    logAction('CREATE', 'venue_spaces', payload);
    if (isApply) await adminClient.from('venue_spaces').insert(payload);
  }

  // Capacities
  for (const cap of dataset.capacities) {
    const payload = {
      space_id: spaceKeyToId[cap.spaceKey],
      venue_id: venueId,
      revision_id: revisionId,
      layout: cap.layout,
      capacity: cap.capacity,
      display_order: cap.displayOrder
    };
    logAction('CREATE', 'venue_space_capacity_layouts', payload);
    if (isApply) await adminClient.from('venue_space_capacity_layouts').insert(payload);
  }

  // Amenities
  for (const am of dataset.amenities) {
    const amId = amenityNameToId[am.amenityName] || crypto.randomUUID();
    const payload = {
      space_id: spaceKeyToId[am.spaceKey],
      venue_id: venueId,
      revision_id: revisionId,
      amenity_id: amId
    };
    logAction('CREATE', 'venue_space_amenities', { ...payload, amenityName: am.amenityName });
    if (isApply) await adminClient.from('venue_space_amenities').insert(payload);
  }

  // Event Types
  for (const et of dataset.eventTypes) {
    const etId = eventTypeNameToId[et.eventTypeName] || crypto.randomUUID();
    const payload = {
      space_id: spaceKeyToId[et.spaceKey],
      venue_id: venueId,
      revision_id: revisionId,
      event_type_id: etId
    };
    logAction('CREATE', 'venue_space_event_types', { ...payload, eventTypeName: et.eventTypeName });
    if (isApply) await adminClient.from('venue_space_event_types').insert(payload);
  }

  // Media Collections
  for (const mc of dataset.mediaCollections) {
    const collectionId = crypto.randomUUID();
    collectionKeyToId[mc.collectionKey] = collectionId;
    const payload = {
      id: collectionId,
      venue_id: venueId,
      revision_id: revisionId,
      collection_type: mc.collectionType,
      title: mc.title,
      is_cover: mc.isCover,
      display_order: mc.displayOrder
    };
    logAction('CREATE', 'venue_media_collections', payload);
    if (isApply) await adminClient.from('venue_media_collections').insert(payload);
  }

  // Media Items
  for (const mi of dataset.mediaItems) {
    const payload = {
      id: crypto.randomUUID(),
      collection_id: collectionKeyToId[mi.collectionKey],
      venue_id: venueId,
      storage_path: mi.storagePath,
      media_type: mi.mediaType,
      alt_text: mi.altText,
      is_featured: mi.isFeatured,
      display_order: mi.displayOrder
    };
    logAction('CREATE', 'venue_media_items', payload);
    if (isApply) await adminClient.from('venue_media_items').insert(payload);
  }

  // Logistics
  if (dataset.logistics) {
    const payload = {
      venue_id: venueId,
      revision_id: revisionId,
      parking_capacity: dataset.logistics.parkingCapacity,
      parking_notes: dataset.logistics.parkingNotes,
      noise_restrictions: dataset.logistics.noiseRestrictions,
      curfew_time: dataset.logistics.curfewTime
    };
    logAction('CREATE', 'venue_logistics', payload);
    if (isApply) await adminClient.from('venue_logistics').insert(payload);
  }

  // Package Spaces
  if (dataset.packageSpaces) {
    for (const ps of dataset.packageSpaces) {
      const packageId = packageNameToId[ps.packageName] || crypto.randomUUID();
      const payload = {
        venue_id: venueId,
        package_id: packageId,
        space_id: spaceKeyToId[ps.spaceKey],
        inclusion_type: ps.inclusionType
      };
      logAction('CREATE', 'package_venue_spaces', { ...payload, packageName: ps.packageName });
      if (isApply) await adminClient.from('package_venue_spaces').insert(payload);
    }
  }

  console.log("Import process complete.");
}

run().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
