import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const venueSlug = process.argv[2];

if (!venueSlug) {
  console.error("Usage: node export-immersive-venue-content.mjs <venue-slug>");
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

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log(`Exporting structured content for venue slug: ${venueSlug}`);

  const { data: venue, error: venueErr } = await adminClient
    .from('venues')
    .select('id, name')
    .eq('slug', venueSlug)
    .single();

  if (venueErr || !venue) {
    console.error(`Failed to find venue with slug: ${venueSlug}`, venueErr?.message);
    process.exit(1);
  }

  // Fetch the latest published revision
  const { data: revision } = await adminClient
    .from('venue_profile_revisions')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  if (!revision) {
    console.log(`No published revision found for ${venueSlug}. Nothing to export.`);
    process.exit(0);
  }

  const revisionId = revision.id;

  const [{ data: spaces }, { data: capacities }, { data: logistics }] = await Promise.all([
    adminClient.from('venue_spaces').select('*').eq('revision_id', revisionId),
    adminClient.from('venue_space_capacity_layouts').select('*').eq('revision_id', revisionId),
    adminClient.from('venue_logistics').select('*').eq('revision_id', revisionId).single(),
  ]);

  const output = {
    schemaVersion: "1.0",
    venueSlug,
    displayName: venue.name,
    contentSourceNotes: `Exported from revision ${revisionId}`,
    spaces: spaces || [],
    capacities: capacities || [],
    logistics: logistics || {}
  };

  const outPath = path.join(__dirname, `../data/venues/${venueSlug}.backup.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Exported successfully to ${outPath}`);
}

run().catch(err => {
  console.error("Export failed:", err);
  process.exit(1);
});
