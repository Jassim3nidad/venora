const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Loaded so the URL can live in the gitignored .env.local instead of being
// exported by hand. Optional: an exported SUPABASE_DB_URL works on its own.
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

/**
 * The connection string is read from the environment and never stored in
 * this file. It was previously hardcoded here in plaintext while the repo
 * was public, so any credential that ever appeared in this file must be
 * treated as compromised and rotated, not merely deleted.
 */
function requireDbUrl() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL is not set.\n' +
      '  Add it to .env.local (gitignored) or export it in your shell:\n' +
      '    SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n' +
      '  Supabase Dashboard > Project Settings > Database > Connection string.'
    );
  }
  return url;
}

async function run() {
  const client = new Client({
    connectionString: requireDbUrl(),
  });
  await client.connect();
  console.log("Connected to database.");

  const files = [
    'supabase/migrations/20260717013034_fix_smart_search_venues.sql',
    'supabase/migrations/20260717031107_fix_coordinator_invitation_flow.sql',
    'supabase/migrations/20260717143000_ensure_organization_owner_membership.sql',
    'supabase/migrations/20260720063605_public_owner_profiles.sql'
  ];

  for (const f of files) {
    const fullPath = path.join(__dirname, f);
    const sql = fs.readFileSync(fullPath, 'utf8');
    try {
      await client.query(sql);
      console.log(`Successfully executed ${f}`);
    } catch (e) {
      console.error(`Failed to execute ${f}:`, e.message);
    }
  }

  console.log("Reloading PostgREST schema cache...");
  await client.query("NOTIFY pgrst, 'reload schema';");
  await client.end();
}

run();
